/**
 * Controlador responsável por gerenciar documentos de gestantes.
 * Inclui funções para upload, listagem, consulta, atualização e exclusão de documentos.
 */
const fs = require('fs');
const client = require('../backend');

const ALLOWED_DOCUMENT_UPDATE_FIELDS = ['document_name', 'document_type'];

function getUploadedFile(req) {
  return req.files?.file?.[0] || req.files?.document?.[0] || req.file || null;
}

function removeFileIfExists(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function cleanupUploadedFile(req) {
  const file = getUploadedFile(req);
  removeFileIfExists(file?.path);
}

async function doctorCanAccessPregnant(doctorId, pregnantId) {
  const result = await client.query(
    `
    SELECT 1
    FROM doctor_patient_links
    WHERE doctor_id = $1
      AND pregnant_id = $2
      AND status = 'active'
    LIMIT 1
    `,
    [doctorId, pregnantId]
  );

  return result.rows.length > 0;
}

async function ensureCanAccessPregnant(req, res, pregnantId) {
  if (!req.user) {
    res.status(401).json({ error: 'Usuário não autenticado' });
    return false;
  }

  if (!pregnantId) {
    res.status(400).json({ error: 'pregnant_id é obrigatório.' });
    return false;
  }

  if (req.user.role === 'admin') {
    return true;
  }

  if (req.user.role === 'medico') {
    const allowed = await doctorCanAccessPregnant(req.user.id, pregnantId);

    if (!allowed) {
      res.status(403).json({ error: 'Médico não vinculado a esta gestante' });
      return false;
    }

    return true;
  }

  res.status(403).json({ error: 'Perfil de usuário não autorizado' });
  return false;
}

async function findDocumentById(id) {
  const result = await client.query(
    'SELECT * FROM pregnant_documents WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Função 1
 * Faz o upload de um documento e associa à gestante correspondente.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `file` (arquivo enviado) e `body` (pregnant_id, document_name, document_type).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Documento inserido no banco de dados e mensagem de sucesso.
 */
const uploadDocument = async (req, res) => {
  try {
    const file = getUploadedFile(req);
    if (!file) return res.status(400).send('Nenhum arquivo enviado.');

    const { pregnant_id, document_name, document_type } = req.body;
    if (!pregnant_id) {
      cleanupUploadedFile(req);
      return res.status(400).json({ error: 'pregnant_id é obrigatório.' });
    }
    if (!document_name) {
      cleanupUploadedFile(req);
      return res.status(400).json({ error: 'document_name é obrigatório.' });
    }

    const canAccess = await ensureCanAccessPregnant(req, res, pregnant_id);
    if (!canAccess) {
      cleanupUploadedFile(req);
      return;
    }

    // O multer salva o arquivo em file.path (caminho do arquivo salvo)
    const file_path = file.path;

    const result = await client.query(
      `INSERT INTO pregnant_documents 
        (pregnant_id, document_name, document_type, file_path) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [pregnant_id, document_name, document_type, file_path]
    );

    res.status(201).json({
      message: 'Documento enviado e associado com sucesso!',
      document: result.rows[0],
    });
  } catch (err) {
    cleanupUploadedFile(req);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 2
 * Lista todos os documentos associados a uma gestante.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `query.pregnant_id` (ID da gestante).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Lista de documentos cadastrados.
 */
const getDocuments = async (req, res) => {
  const { pregnant_id } = req.query;

  if (!pregnant_id) {
    return res.status(400).json({ error: 'Parâmetro pregnant_id é obrigatório' });
  }
  try {
    const canAccess = await ensureCanAccessPregnant(req, res, pregnant_id);
    if (!canAccess) return;

    const result = await client.query(
      'SELECT * FROM pregnant_documents WHERE pregnant_id = $1',
      [pregnant_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 3
 * Retorna um documento específico pelo ID.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `params.id` (ID do documento).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Documento correspondente ao ID informado.
 */
const getDocumentById = async (req, res) => {
  const { id } = req.params;

  try {
    const document = await findDocumentById(id);

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const canAccess = await ensureCanAccessPregnant(req, res, document.pregnant_id);
    if (!canAccess) return;

    res.json(document);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 4
 * Baixa o arquivo físico de um documento, após validar o acesso ao prontuário.
 */
const downloadDocument = async (req, res) => {
  const { id } = req.params;

  try {
    const document = await findDocumentById(id);

    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const canAccess = await ensureCanAccessPregnant(req, res, document.pregnant_id);
    if (!canAccess) return;

    if (!document.file_path || !fs.existsSync(document.file_path)) {
      return res.status(404).json({ error: 'Arquivo do documento não encontrado.' });
    }

    res.download(document.file_path, document.document_name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 5
 * Exclui um documento e o arquivo físico associado.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `params.id` (ID do documento).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Mensagem de confirmação da exclusão.
 */
const deleteDocument = async (req, res) => {
  const { id } = req.params;

  try {
    const doc = await findDocumentById(id);

    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const canAccess = await ensureCanAccessPregnant(req, res, doc.pregnant_id);
    if (!canAccess) return;

    removeFileIfExists(doc.file_path);

    await client.query('DELETE FROM pregnant_documents WHERE id = $1', [id]);

    res.json({ message: 'Documento removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 6
 * Atualiza as informações de um documento existente.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `params.id` (ID do documento) e `body` (dados para atualização).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Documento atualizado.
 */
const updateDocument = async (req, res) => {
  try {
    const document = await findDocumentById(req.params.id);
    if (!document) return res.status(404).send('Documento não encontrado');

    const canAccess = await ensureCanAccessPregnant(req, res, document.pregnant_id);
    if (!canAccess) return;

    const entries = Object.entries(req.body).filter(([field, value]) => (
      ALLOWED_DOCUMENT_UPDATE_FIELDS.includes(field) &&
      value !== undefined
    ));

    if (entries.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
    }

    const setClause = entries
      .map(([field], index) => `${field} = $${index + 1}`)
      .join(', ');
    const values = entries.map(([, value]) => value);

    const result = await client.query(
      `
      UPDATE pregnant_documents
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length + 1}
      RETURNING *
      `,
      [...values, req.params.id]
    );

    const updatedDoc = result.rows[0];
    res.json(updatedDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  downloadDocument,
  deleteDocument,
  updateDocument,
};
