const client = require('../backend');
const cryptoService = require('../services/cryptoService');
const {
  ensureCanAccessPregnancy,
  findEventById,
} = require('../utils/clinicalAccess');

const UPDATE_FIELDS = ['descricao', 'data_evento'];

const createEvent = async (req, res) => {
  const { pregnancy_id, descricao, data_evento } = req.body || {};
  if (!pregnancy_id || !descricao || !data_evento) {
    return res.status(400).json({
      error: 'pregnancy_id, descricao e data_evento sao obrigatorios',
    });
  }

  try {
    if (!(await ensureCanAccessPregnancy(req, res, pregnancy_id))) return;
    const encrypted = cryptoService.encryptRecord(
      { descricao, data_evento },
      'pregnancy_events'
    );
    const result = await client.query(
      `INSERT INTO pregnancy_events (
         pregnancy_id, descricao, data_evento, encryption_key_version
       ) VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        pregnancy_id,
        encrypted.descricao,
        encrypted.data_evento,
        cryptoService.getCurrentVersion(),
      ]
    );
    return res.status(201).json(
      cryptoService.decryptRecord(result.rows[0], 'pregnancy_events')
    );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getEvents = async (req, res) => {
  const { pregnancy_id } = req.query;
  if (!pregnancy_id) {
    return res.status(400).json({ error: 'O pregnancy_id e obrigatorio' });
  }

  try {
    if (!(await ensureCanAccessPregnancy(req, res, pregnancy_id))) return;
    const result = await client.query(
      `SELECT * FROM pregnancy_events
        WHERE pregnancy_id = $1 ORDER BY created_at DESC`,
      [pregnancy_id]
    );
    const events = result.rows
      .map((row) => cryptoService.decryptRecord(row, 'pregnancy_events'))
      .sort((left, right) => (
        new Date(right.data_evento).getTime() -
        new Date(left.data_evento).getTime()
      ));
    return res.json(events);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updatePregnancyEvent = async (req, res) => {
  try {
    const event = await findEventById(req.params.id);
    if (!event) return res.status(404).send('Evento nao encontrado');
    if (!(await ensureCanAccessPregnancy(req, res, event.pregnancy_id))) return;

    const updateData = Object.fromEntries(
      Object.entries(req.body || {}).filter(
        ([field, value]) => UPDATE_FIELDS.includes(field) && value !== undefined
      )
    );
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'Nenhum campo valido para atualizar',
      });
    }
    const encrypted = cryptoService.encryptRecord(
      updateData,
      'pregnancy_events'
    );
    encrypted.encryption_key_version = cryptoService.getCurrentVersion();
    const entries = Object.entries(encrypted);
    const setClause = entries
      .map(([field], index) => `${field} = $${index + 1}`)
      .join(', ');
    const result = await client.query(
      `UPDATE pregnancy_events
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${entries.length + 1}
        RETURNING *`,
      [...entries.map(([, value]) => value), req.params.id]
    );
    return res.json(
      cryptoService.decryptRecord(result.rows[0], 'pregnancy_events')
    );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createEvent,
  getEvents,
  updatePregnancyEvent,
};
