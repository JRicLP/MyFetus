const client = require('../backend');
const cryptoService = require('../services/cryptoService');
const {
  ensureCanAccessPregnant,
} = require('../utils/clinicalAccess');
const { audit } = require('../services/auditService');

function normalizeText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function presentRequest(row) {
  return cryptoService.decryptRecord(row, 'exam_requests');
}

async function findRequestById(id) {
  const result = await client.query(
    'SELECT * FROM exam_requests WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

const createExamRequest = async (req, res) => {
  const { pregnant_id: pregnantId } = req.body || {};
  const examName = normalizeText(req.body?.exam_name);
  const instructions = normalizeText(req.body?.instructions);

  if (!pregnantId || !examName) {
    return res.status(400).json({
      error: 'pregnant_id e exam_name sao obrigatorios',
    });
  }
  if (examName.length > 255 || (instructions && instructions.length > 2000)) {
    return res.status(400).json({
      error: 'exam_name ou instructions excede o limite permitido',
    });
  }

  try {
    if (!(await ensureCanAccessPregnant(req, res, pregnantId))) return;

    const encrypted = cryptoService.encryptRecord({
      exam_name: examName,
      instructions,
    }, 'exam_requests');
    const result = await client.query(
      `INSERT INTO exam_requests (
         pregnant_id, doctor_id, exam_name, instructions, encryption_key_version
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        pregnantId,
        req.user.id,
        encrypted.exam_name,
        encrypted.instructions,
        cryptoService.getCurrentVersion(),
      ]
    );

    audit(req, {
      action: 'EXAM_REQUEST_CREATED',
      resource: 'exam_requests',
      resource_id: result.rows[0].id,
      outcome: 'SUCCESS',
      detail: { pregnant_id: pregnantId },
    });
    return res.status(201).json(presentRequest(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar solicitacao de exame' });
  }
};

const getExamRequests = async (req, res) => {
  const pregnantId = req.params.pregnantId;
  if (!pregnantId) {
    return res.status(400).json({ error: 'pregnant_id e obrigatorio' });
  }

  try {
    if (!(await ensureCanAccessPregnant(req, res, pregnantId))) return;
    const result = await client.query(
      `SELECT * FROM exam_requests
       WHERE pregnant_id = $1
       ORDER BY requested_at DESC, id DESC`,
      [pregnantId]
    );
    return res.json(result.rows.map(presentRequest));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar solicitacoes de exame' });
  }
};

const cancelExamRequest = async (req, res) => {
  try {
    const request = await findRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Solicitacao de exame nao encontrada' });
    }
    if (!(await ensureCanAccessPregnant(req, res, request.pregnant_id))) return;
    if (request.doctor_id !== req.user.id) {
      return res.status(403).json({ error: 'Somente o medico solicitante pode cancelar o pedido' });
    }
    if (request.status !== 'pending') {
      return res.status(409).json({
        error: 'Somente solicitacoes pendentes podem ser canceladas',
      });
    }

    const result = await client.query(
      `UPDATE exam_requests
       SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [request.id]
    );
    if (!result.rows[0]) {
      return res.status(409).json({ error: 'A solicitacao ja foi alterada' });
    }

    audit(req, {
      action: 'EXAM_REQUEST_CANCELLED',
      resource: 'exam_requests',
      resource_id: request.id,
      outcome: 'SUCCESS',
      detail: { pregnant_id: request.pregnant_id },
    });
    return res.json(presentRequest(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao cancelar solicitacao de exame' });
  }
};

module.exports = {
  cancelExamRequest,
  createExamRequest,
  getExamRequests,
};
