const bcrypt = require('bcrypt');
const client = require('../backend');
const cryptoService = require('../services/cryptoService');
const {
  hashDoctorCrm,
  hashEmail,
  normalizeCrm,
  normalizeCrmState,
  normalizeEmail,
} = require('../services/emailLookupService');
const { DOCTOR_APPROVAL_STATUSES, getDoctorApproval } = require('../services/doctorApprovalService');
const logger = require('../utils/logger');
const { audit, buildAuditEntry } = require('../services/auditService');
const {
  ConsentValidationError,
  recordDecision,
  validateSignupConsents,
} = require('../services/consentService');

const SALT_ROUNDS = 10;
const DOCTOR_ROLE = 'medico';

function sanitizeUser(user) {
  if (!user) return null;
  const { password, email_lookup_hash, encryption_key_version, ...safeUser } = user;
  return safeUser;
}

function sanitizeDoctor(doctor) {
  if (!doctor) return null;
  const {
    encryption_key_version,
    crm_lookup_hash,
    approval_decided_by,
    ...safeDoctor
  } = doctor;
  return safeDoctor;
}

function validateCrm(crm, crmEstado) {
  if (typeof crm !== 'string' || !normalizeCrm(crm) || normalizeCrm(crm).length > 20) {
    return 'CRM inválido';
  }
  if (typeof crmEstado !== 'string' || !/^[A-Za-z]{2}$/.test(crmEstado.trim())) {
    return 'UF do CRM inválida';
  }
  return null;
}

function approvalResponse(user, doctor) {
  const decryptedUser = cryptoService.decryptRecord(user, 'users');
  const decryptedDoctor = cryptoService.decryptRecord(doctor, 'doctors');
  return {
    user: sanitizeUser(decryptedUser),
    doctor: sanitizeDoctor(decryptedDoctor),
  };
}

/**
 * Cria uma conta de médico (role 'medico') e o registro correspondente em
 * `doctors`. Cadastro público — qualquer pessoa pode chamar, sem login.
 */
const createDoctor = async (req, res) => {
  const { name, email, password, birthdate, crm, crm_estado, especialidade, telefone, consents } = req.body || {};

  const crmError = validateCrm(crm, crm_estado);
  if (
    typeof name !== 'string' || !name.trim() ||
    typeof email !== 'string' || !email.trim() ||
    typeof password !== 'string' || password.length < 8 ||
    typeof birthdate !== 'string' || !birthdate ||
    crmError
  ) {
    return res.status(400).json({
      error: 'Nome, email, senha (8+ caracteres), data de nascimento, CRM e UF do CRM (2 letras) são obrigatórios',
    });
  }

  // E7-01.1: médico aceita os termos do próprio perfil e declara ciência da política.
  let acceptedConsents;
  try {
    acceptedConsents = validateSignupConsents(consents, DOCTOR_ROLE);
  } catch (error) {
    if (!(error instanceof ConsentValidationError)) throw error;
    const { status, code, message } = error;
    return res.status(status).json({ error: message, code });
  }

  let dbClient;
  try {
    const normalizedEmail = normalizeEmail(email);
    const encryptedUser = cryptoService.encryptRecord(
      { name: name.trim(), email: normalizedEmail, birthdate },
      'users'
    );
    const encryptedDoctor = cryptoService.encryptRecord(
      {
        crm: normalizeCrm(crm),
        crm_estado: normalizeCrmState(crm_estado),
        telefone: telefone ? String(telefone).trim() : null,
      },
      'doctors'
    );
    const crmLookupHash = hashDoctorCrm(crm, crm_estado);
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    dbClient = await client.connect();
    await dbClient.query('BEGIN');

    const userResult = await dbClient.query(
      `INSERT INTO users (
         name, email, password, birthdate, is_active, role,
         email_lookup_hash, encryption_key_version
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        encryptedUser.name,
        encryptedUser.email,
        hashedPassword,
        encryptedUser.birthdate,
        true,
        DOCTOR_ROLE,
        hashEmail(normalizedEmail),
        cryptoService.getCurrentVersion(),
      ]
    );
    const user = userResult.rows[0];

    const doctorResult = await dbClient.query(
      `INSERT INTO doctors (
         user_id, crm, crm_estado, especialidade, telefone,
         crm_lookup_hash, approval_status, is_synthetic, encryption_key_version
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', false, $7)
       RETURNING *`,
      [
        user.id,
        encryptedDoctor.crm,
        encryptedDoctor.crm_estado,
        especialidade ? String(especialidade).trim() : null,
        encryptedDoctor.telefone,
        crmLookupHash,
        cryptoService.getCurrentVersion(),
      ]
    );

    const { ip_address: ipAddress, user_agent: userAgent } = buildAuditEntry(req, {});
    for (const { purpose, version } of acceptedConsents) {
      await recordDecision(dbClient, {
        userId: user.id,
        purpose,
        version,
        decision: 'accepted',
        ipAddress,
        userAgent,
      });
    }

    await dbClient.query('COMMIT');

    audit(req, {
      action: 'DOCTOR_REGISTERED',
      resource: 'doctors',
      resource_id: user.id,
      actor_id: user.id,
      actor_role: DOCTOR_ROLE,
      outcome: 'SUCCESS',
      detail: { approval_status: 'pending' },
    });
    audit(req, {
      action: 'CONSENT_ACCEPTED',
      resource: 'consents',
      resource_id: user.id,
      actor_id: user.id,
      actor_role: DOCTOR_ROLE,
      outcome: 'SUCCESS',
      detail: { consents: acceptedConsents },
    });

    return res.status(201).json({
      ...approvalResponse(user, doctorResult.rows[0]),
    });
  } catch (error) {
    if (dbClient) {
      try {
        await dbClient.query('ROLLBACK');
      } catch (_) {
        // Ignore rollback errors.
      }
    }
    logger.error('Erro ao criar médico', { details: error.message, email });
    if (error.code === '23505' && error.constraint === 'doctors_crm_lookup_hash_unique') {
      return res.status(409).json({ error: 'CRM já cadastrado para esta UF' });
    }
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    return res.status(500).json({ error: 'Erro ao criar médico' });
  } finally {
    if (dbClient) dbClient.release();
  }
};

const listDoctors = async (req, res) => {
  const status = req.query.approval_status || null;
  if (status && !DOCTOR_APPROVAL_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status de aprovação inválido' });
  }

  try {
    const result = await client.query(
      `SELECT d.*, u.id AS user_id, u.name, u.email, u.birthdate, u.is_active
         FROM doctors d
         JOIN users u ON u.id = d.user_id
        WHERE ($1::varchar IS NULL OR d.approval_status = $1)
        ORDER BY d.created_at ASC`,
      [status]
    );

    return res.json(result.rows.map((row) => {
      const user = cryptoService.decryptRecord(row, 'users');
      const doctor = cryptoService.decryptRecord(row, 'doctors');
      return {
        id: doctor.id,
        user_id: user.id,
        name: user.name,
        email: user.email,
        birthdate: user.birthdate,
        is_active: user.is_active,
        ...sanitizeDoctor(doctor),
      };
    }));
  } catch (error) {
    logger.error('Erro ao listar aprovações de médicos', { details: error.message });
    return res.status(500).json({ error: 'Erro ao listar médicos' });
  }
};

const getMyApproval = async (req, res) => {
  try {
    const doctor = await getDoctorApproval(req.user.id);
    if (!doctor) return res.status(404).json({ error: 'Perfil médico não encontrado' });
    return res.json({
      approval_status: doctor.approval_status,
      approval_reason: doctor.approval_reason,
    });
  } catch (error) {
    logger.error('Erro ao consultar aprovação do médico', { details: error.message });
    return res.status(500).json({ error: 'Erro ao consultar aprovação' });
  }
};

const decideDoctorApproval = async (req, res) => {
  const doctorId = Number(req.params.id);
  const decision = String(req.body?.decision || '').trim().toLowerCase();
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  const statusByDecision = {
    approve: 'approved',
    reject: 'rejected',
    revoke: 'revoked',
  };

  if (!Number.isInteger(doctorId) || doctorId < 1) {
    return res.status(400).json({ error: 'ID do médico inválido' });
  }
  if (!statusByDecision[decision]) {
    return res.status(400).json({ error: 'Decisão inválida' });
  }
  if (decision !== 'approve' && !reason) {
    return res.status(400).json({ error: 'Motivo é obrigatório para rejeição ou revogação' });
  }
  if (reason.length > 500) {
    return res.status(400).json({ error: 'Motivo excede 500 caracteres' });
  }

  try {
    const result = await client.query(
      `UPDATE doctors
          SET approval_status = $1,
              approval_reason = $2,
              approval_decided_at = CURRENT_TIMESTAMP,
              approval_decided_by = $3,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *`,
      [statusByDecision[decision], reason || null, req.user.id, doctorId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Médico não encontrado' });

    audit(req, {
      action: 'DOCTOR_APPROVAL_DECIDED',
      resource: 'doctors',
      resource_id: doctorId,
      outcome: 'SUCCESS',
      detail: { decision, approval_status: statusByDecision[decision] },
    });

    const doctor = cryptoService.decryptRecord(result.rows[0], 'doctors');
    return res.json({
      doctor: sanitizeDoctor(doctor),
      approval_status: doctor.approval_status,
    });
  } catch (error) {
    logger.error('Erro ao decidir aprovação de médico', { details: error.message });
    return res.status(500).json({ error: 'Erro ao atualizar aprovação' });
  }
};

const resubmitDoctorApproval = async (req, res) => {
  const { crm, crm_estado: crmEstado, especialidade, telefone } = req.body || {};
  const crmError = validateCrm(crm, crmEstado);
  if (crmError) return res.status(400).json({ error: crmError });

  try {
    const current = await client.query(
      'SELECT * FROM doctors WHERE user_id = $1 LIMIT 1',
      [req.user.id]
    );
    if (!current.rows[0]) return res.status(404).json({ error: 'Perfil médico não encontrado' });
    if (!['rejected', 'revoked'].includes(current.rows[0].approval_status)) {
      return res.status(409).json({ error: 'O perfil não está disponível para reenvio' });
    }

    const encryptedDoctor = cryptoService.encryptRecord(
      {
        crm: normalizeCrm(crm),
        crm_estado: normalizeCrmState(crmEstado),
        telefone: telefone ? String(telefone).trim() : null,
      },
      'doctors'
    );
    const result = await client.query(
      `UPDATE doctors
          SET crm = $1,
              crm_estado = $2,
              especialidade = $3,
              telefone = $4,
              crm_lookup_hash = $5,
              approval_status = 'pending',
              approval_reason = NULL,
              approval_decided_at = NULL,
              approval_decided_by = NULL,
              updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6
        RETURNING *`,
      [
        encryptedDoctor.crm,
        encryptedDoctor.crm_estado,
        especialidade ? String(especialidade).trim() : null,
        encryptedDoctor.telefone,
        hashDoctorCrm(crm, crmEstado),
        req.user.id,
      ]
    );

    audit(req, {
      action: 'DOCTOR_APPROVAL_RESUBMITTED',
      resource: 'doctors',
      resource_id: result.rows[0].id,
      outcome: 'SUCCESS',
      detail: { approval_status: 'pending' },
    });

    return res.status(200).json({
      message: 'Dados reenviados para aprovação',
      doctor: sanitizeDoctor(cryptoService.decryptRecord(result.rows[0], 'doctors')),
    });
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'doctors_crm_lookup_hash_unique') {
      return res.status(409).json({ error: 'CRM já cadastrado para esta UF' });
    }
    logger.error('Erro ao reenviar dados do médico', { details: error.message });
    return res.status(500).json({ error: 'Erro ao reenviar dados para aprovação' });
  }
};

module.exports = {
  createDoctor,
  decideDoctorApproval,
  getMyApproval,
  listDoctors,
  resubmitDoctorApproval,
};
