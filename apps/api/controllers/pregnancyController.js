const client = require('../backend');
const cryptoService = require('../services/cryptoService');
const {
  ensureCanAccessPregnant,
  ensureCanAccessPregnancy,
} = require('../utils/clinicalAccess');
const logger = require('../utils/logger');

const UPDATE_FIELDS = ['glicemia', 'frequencia_cardiaca', 'altura_uterina'];

const createPregnancy = async (req, res) => {
  const {
    pregnant_id,
    weeks,
    is_checked = false,
    dum,
    dpp,
    ccn = 0,
    dgm = 0,
    glicemia = 0,
    frequencia_cardiaca = 0,
    altura_uterina = 0,
    regularidade_do_ciclo = true,
    ig_ultrassonografia,
  } = req.body || {};

  if (!pregnant_id) {
    return res.status(400).json({ error: 'pregnant_id e obrigatorio' });
  }
  if (!dum || !dpp || !ig_ultrassonografia) {
    return res.status(400).json({
      error: 'Campos dum, dpp e ig_ultrassonografia sao obrigatorios',
    });
  }

  try {
    if (!(await ensureCanAccessPregnant(req, res, pregnant_id))) return;
    const encrypted = cryptoService.encryptRecord({
      weeks,
      is_checked,
      dum,
      dpp,
      ccn,
      dgm,
      glicemia,
      frequencia_cardiaca,
      altura_uterina,
      regularidade_do_ciclo,
      ig_ultrassonografia,
    }, 'pregnancies');

    const result = await client.query(
      `INSERT INTO pregnancies (
         pregnant_id, weeks, is_checked, dum, dpp, ccn, dgm, glicemia,
         frequencia_cardiaca, altura_uterina, regularidade_do_ciclo,
         ig_ultrassonografia, encryption_key_version
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        pregnant_id,
        encrypted.weeks,
        encrypted.is_checked,
        encrypted.dum,
        encrypted.dpp,
        encrypted.ccn,
        encrypted.dgm,
        encrypted.glicemia,
        encrypted.frequencia_cardiaca,
        encrypted.altura_uterina,
        encrypted.regularidade_do_ciclo,
        encrypted.ig_ultrassonografia,
        cryptoService.getCurrentVersion(),
      ]
    );
    return res.status(201).json(
      cryptoService.decryptRecord(result.rows[0], 'pregnancies')
    );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getPregnancies = async (req, res) => {
  let query;
  let params = [];
  if (req.user.role === 'admin') {
    query = 'SELECT * FROM pregnancies ORDER BY created_at DESC';
  } else if (req.user.role === 'medico') {
    query = `SELECT preg.* FROM pregnancies preg
      JOIN doctor_patient_links dpl ON dpl.pregnant_id = preg.pregnant_id
      WHERE dpl.doctor_id = $1 AND dpl.status = 'active'
      ORDER BY preg.created_at DESC`;
    params = [req.user.id];
  } else if (req.user.role === 'gestante') {
    query = `SELECT preg.* FROM pregnancies preg
      JOIN pregnants p ON p.id = preg.pregnant_id
      WHERE p.user_id = $1 ORDER BY preg.created_at DESC`;
    params = [req.user.id];
  } else {
    return res.status(403).json({ error: 'Perfil de usuario nao autorizado' });
  }

  try {
    const result = await client.query(query, params);
    return res.json(result.rows.map(
      (row) => cryptoService.decryptRecord(row, 'pregnancies')
    ));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updatePregnancy = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await ensureCanAccessPregnancy(req, res, id))) return;
    const updateData = Object.fromEntries(
      Object.entries(req.body || {}).filter(
        ([field, value]) => UPDATE_FIELDS.includes(field) && value !== undefined
      )
    );
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    const encrypted = cryptoService.encryptRecord(updateData, 'pregnancies');
    encrypted.encryption_key_version = cryptoService.getCurrentVersion();
    const entries = Object.entries(encrypted);
    const setClause = entries
      .map(([field], index) => `${field} = $${index + 1}`)
      .join(', ');
    const result = await client.query(
      `UPDATE pregnancies
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${entries.length + 1}
        RETURNING *`,
      [...entries.map(([, value]) => value), id]
    );
    if (!result.rows[0]) return res.status(404).send('Gravidez nao encontrada');
    return res.json(
      cryptoService.decryptRecord(result.rows[0], 'pregnancies')
    );
  } catch (error) {
    logger.error('Erro ao atualizar gravidez', {
      details: error.message,
      pregnancyId: id,
    });
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createPregnancy,
  getPregnancies,
  updatePregnancy,
};
