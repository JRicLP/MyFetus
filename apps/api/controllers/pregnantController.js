const client = require('../backend');
const { PREGNANT_CLINICAL_FIELDS } = require('../config/dataClassification');
const {
  decryptPregnantDetails,
  decryptPregnantSummary,
} = require('../services/clinicalDataService');
const cryptoService = require('../services/cryptoService');
const {
  doctorCanAccessPregnant,
  findPregnantById,
} = require('../utils/clinicalAccess');
const logger = require('../utils/logger');

function ensureAuthenticated(req, res) {
  if (!req.user) {
    res.status(401).json({ error: 'Usuario nao autenticado' });
    return false;
  }
  return true;
}

async function ensureCanAccessPregnant(req, res, pregnant) {
  if (!pregnant) {
    res.status(404).json({ error: 'Gestante nao encontrada' });
    return false;
  }
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'gestante') {
    if (pregnant.user_id !== req.user.id) {
      res.status(403).json({ error: 'Acesso negado' });
      return false;
    }
    return true;
  }
  if (req.user.role === 'medico') {
    const allowed = await doctorCanAccessPregnant(req.user.id, pregnant.id);
    if (!allowed) {
      res.status(403).json({ error: 'Medico nao vinculado a esta gestante' });
      return false;
    }
    return true;
  }
  res.status(403).json({ error: 'Perfil de usuario nao autorizado' });
  return false;
}

const createPregnant = async (req, res) => {
  if (!ensureAuthenticated(req, res)) return;
  const userId = req.user.role === 'admin' && req.body.user_id
    ? req.body.user_id
    : req.user.id;

  try {
    const result = await client.query(
      'INSERT INTO pregnants (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getPregnants = async (req, res) => {
  if (!ensureAuthenticated(req, res)) return;
  let query;
  let params = [];
  const baseSelect = `
    SELECT p.id AS pregnant_id, p.user_id, u.name AS patient_name, u.birthdate,
      (SELECT weeks FROM pregnancies preg
        WHERE preg.pregnant_id = p.id
        ORDER BY preg.created_at DESC LIMIT 1) AS semanas_gestacao
      FROM pregnants p
      JOIN users u ON p.user_id = u.id`;

  if (req.user.role === 'admin') {
    query = `${baseSelect} WHERE u.role = 'gestante'`;
  } else if (req.user.role === 'medico') {
    query = `${baseSelect}
      JOIN doctor_patient_links dpl ON dpl.pregnant_id = p.id
      WHERE u.role = 'gestante' AND dpl.doctor_id = $1
        AND dpl.status = 'active'`;
    params = [req.user.id];
  } else if (req.user.role === 'gestante') {
    query = `${baseSelect}
      WHERE u.role = 'gestante' AND p.user_id = $1`;
    params = [req.user.id];
  } else {
    return res.status(403).json({ error: 'Perfil de usuario nao autorizado' });
  }

  try {
    const result = await client.query(query, params);
    const rows = result.rows
      .map(decryptPregnantSummary)
      .sort((left, right) => String(left.patient_name).localeCompare(
        String(right.patient_name),
        'pt-BR'
      ));
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updatePregnant = async (req, res) => {
  if (!ensureAuthenticated(req, res)) return;
  const { id } = req.params;

  try {
    if (req.user.role === 'gestante') {
      return res.status(403).json({
        error: 'Gestante nao pode atualizar dados clinicos por esta rota',
      });
    }
    if (!['medico', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Perfil de usuario nao autorizado' });
    }

    const pregnant = await findPregnantById(id);
    if (!(await ensureCanAccessPregnant(req, res, pregnant))) return;

    const updateData = Object.fromEntries(
      Object.entries(req.body || {}).filter(
        ([field, value]) => PREGNANT_CLINICAL_FIELDS.includes(field) &&
          value !== undefined
      )
    );
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'Nenhum campo valido para atualizar',
      });
    }

    const encrypted = cryptoService.encryptRecord(updateData, 'pregnants');
    encrypted.encryption_key_version = cryptoService.getCurrentVersion();
    const entries = Object.entries(encrypted);
    const setClause = entries
      .map(([field], index) => `${field} = $${index + 1}`)
      .join(', ');
    const result = await client.query(
      `UPDATE pregnants SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${entries.length + 1} RETURNING *`,
      [...entries.map(([, value]) => value), id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Gestante nao encontrada' });
    }
    return res.json(cryptoService.decryptRecord(result.rows[0], 'pregnants'));
  } catch (error) {
    logger.error('Erro ao atualizar gestante', {
      details: error.message,
      pregnantId: id,
    });
    return res.status(500).json({ error: error.message });
  }
};

const getPregnantById = async (req, res) => {
  if (!ensureAuthenticated(req, res)) return;
  const { id } = req.params;

  try {
    const baseResult = await client.query(
      `SELECT p.*, u.name AS patient_name, u.birthdate
         FROM pregnants p
         JOIN users u ON p.user_id = u.id
        WHERE p.id = $1`,
      [id]
    );
    const row = baseResult.rows[0];
    if (!row) return res.status(404).json({ error: 'Gestante nao encontrada' });
    if (!(await ensureCanAccessPregnant(req, res, row))) return;

    const [pregnancyResult, eventsResult] = await Promise.all([
      client.query(
        `SELECT * FROM pregnancies
          WHERE pregnant_id = $1
          ORDER BY created_at DESC LIMIT 1`,
        [id]
      ),
      client.query(
        `SELECT pe.*
           FROM pregnancy_events pe
           JOIN pregnancies preg ON preg.id = pe.pregnancy_id
          WHERE preg.pregnant_id = $1
          ORDER BY pe.created_at DESC`,
        [id]
      ),
    ]);

    return res.json(decryptPregnantDetails(
      row,
      pregnancyResult.rows[0] || null,
      eventsResult.rows
    ));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createPregnant,
  getPregnants,
  updatePregnant,
  getPregnantById,
};
