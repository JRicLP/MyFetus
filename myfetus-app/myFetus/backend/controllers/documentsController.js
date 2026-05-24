/**
 * Controlador responsável por gerenciar documentos de gestantes.
 * Inclui funções para upload, listagem, consulta, atualização e exclusão de documentos.
 */
const path = require('path');
const fs = require('fs');
const client = require('../backend');
const updateEntity = require('../utils/updateEntity');

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
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const { pregnant_id, document_name, document_type } = req.body;
    if (!pregnant_id) return res.status(400).json({ error: 'pregnant_id é obrigatório.' });
    if (!document_name) return res.status(400).json({ error: 'document_name é obrigatório.' });

    // O multer salva o arquivo em req.file.path (caminho do arquivo salvo)
    const file_path = req.file.path;

    const result = await client.query(
      `INSERT INTO pregnant_documents 
        (pregnant_id, document_name, document_type, file_path, status) 
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [pregnant_id, document_name, document_type, file_path]
    );

    res.status(201).json({
      message: 'Documento enviado e associado com sucesso!',
      document: result.rows[0],
    });
  } catch (err) {
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
    const result = await client.query(
      'SELECT * FROM pregnant_documents WHERE pregnant_id = $1 ORDER BY uploaded_at DESC',
      [pregnant_id]
    );
    const host = req.get('host');
    const protocol = req.protocol;
    const rows = result.rows.map((row) => ({
      ...row,
      download_url: host ? `${protocol}://${host}/api/documents/documents/${row.id}/download` : null,
    }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Salva o relatório/comentário do médico para um documento.
 * Espera JSON: { report_comment: string, doctor_user_id?: number }
 */
const setDocumentReport = async (req, res) => {
  const { id } = req.params;
  const { report_comment, doctor_user_id } = req.body || {};

  if (!report_comment || String(report_comment).trim().length === 0) {
    return res.status(400).json({ error: 'report_comment é obrigatório' });
  }

  const reviewerId = doctor_user_id ? Number(doctor_user_id) : null;
  if (doctor_user_id && Number.isNaN(reviewerId)) {
    return res.status(400).json({ error: 'doctor_user_id inválido' });
  }

  try {
    const result = await client.query(
      `UPDATE pregnant_documents
         SET report_comment = $1,
             reviewed_by_user_id = $2,
             reviewed_at = NOW(),
             status = 'reviewed',
             updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [String(report_comment).trim(), reviewerId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    res.json({
      message: 'Relatório salvo com sucesso!',
      document: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Faz download do arquivo físico associado ao documento.
 */
const downloadDocument = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query('SELECT * FROM pregnant_documents WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const doc = result.rows[0];
    const filePath = doc.file_path ? path.resolve(doc.file_path) : null;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no servidor.' });
    }

    const downloadName = doc.document_name || `documento-${id}`;
    return res.download(filePath, downloadName);
  } catch (err) {
    return res.status(500).json({ error: err.message });
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
    const result = await client.query(
      'SELECT * FROM pregnant_documents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 4
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
    const doc = await client.query(
      'SELECT * FROM pregnant_documents WHERE id = $1',
      [id]
    );

    if (doc.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const { file_path } = doc.rows[0];

    // Remover o arquivo do disco
    if (file_path && fs.existsSync(file_path)) {
      fs.unlinkSync(file_path);
    }

    await client.query('DELETE FROM pregnant_documents WHERE id = $1', [id]);

    res.json({ message: 'Documento removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 5
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
    // updateEntity deve receber o nome correto da tabela
    const updatedDoc = await updateEntity('pregnant_documents', req.params.id, req.body);
    if (!updatedDoc) return res.status(404).send('Documento não encontrado');
    res.json(updatedDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  updateDocument,
  setDocumentReport,
  downloadDocument,
};