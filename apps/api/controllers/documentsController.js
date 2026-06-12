const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const client = require('../backend');
const cryptoService = require('../services/cryptoService');
const fileCryptoService = require('../services/fileCryptoService');
const {
  enqueueDocumentTextExtraction,
  processDocumentTextExtraction,
} = require('../services/documentExtractionWorker');
const logger = require('../utils/logger');

const ALLOWED_DOCUMENT_UPDATE_FIELDS = ['document_name', 'document_type'];
const ENCRYPTED_STORAGE_DIR = path.resolve(
  process.env.DOCUMENT_STORAGE_DIR || 'uploads/encrypted'
);
const UPLOAD_CLEANUP_ROOT = path.resolve(process.env.DOCUMENT_STORAGE_DIR || 'uploads');

function getUploadedFile(req) {
  return req.files?.file?.[0] || req.files?.document?.[0] || req.file || null;
}

async function resolveSafeDeletionPath(filePath) {
  if (!filePath) return null;

  const candidatePath = path.resolve(UPLOAD_CLEANUP_ROOT, filePath);
  const candidateRelativePath = path.relative(UPLOAD_CLEANUP_ROOT, candidatePath);
  if (
    !(candidateRelativePath === '' ||
      (!candidateRelativePath.startsWith('..') && !path.isAbsolute(candidateRelativePath)))
  ) {
    return null;
  }

  let normalizedPath = candidatePath;
  try {
    normalizedPath = await fs.realpath(candidatePath);
  } catch (err) {
    // If the file does not exist, keep resolved candidate path for boundary check.
  }

  const relativePath = path.relative(UPLOAD_CLEANUP_ROOT, normalizedPath);
  if (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  ) {
    return normalizedPath;
  }

  return null;
}

async function removeFileIfExists(filePath) {
  const safePath = await resolveSafeDeletionPath(filePath);
  if (!safePath) {
    logger.warn('Skipping file cleanup outside allowed directory', { filePath });
    return;
  }
  await fs.rm(safePath, { force: true });
}

async function cleanupUploadedFile(req) {
  await removeFileIfExists(getUploadedFile(req)?.path);
}

function decryptDocument(document) {
  return document
    ? cryptoService.decryptRecord(document, 'pregnant_documents')
    : null;
}

function sanitizeDocument(document) {
  if (!document) return null;
  const { file_path, ...safeDocument } = decryptDocument(document);
  return safeDocument;
}

async function doctorCanAccessPregnant(doctorId, pregnantId) {
  const result = await client.query(
    `SELECT 1 FROM doctor_patient_links
      WHERE doctor_id = $1 AND pregnant_id = $2 AND status = 'active'
      LIMIT 1`,
    [doctorId, pregnantId]
  );
  return result.rows.length > 0;
}

async function ensureCanAccessPregnant(req, res, pregnantId) {
  if (!req.user) {
    res.status(401).json({ error: 'Usuario nao autenticado' });
    return false;
  }
  if (!pregnantId) {
    res.status(400).json({ error: 'pregnant_id e obrigatorio' });
    return false;
  }
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'medico') {
    if (!(await doctorCanAccessPregnant(req.user.id, pregnantId))) {
      res.status(403).json({ error: 'Medico nao vinculado a esta gestante' });
      return false;
    }
    return true;
  }
  res.status(403).json({ error: 'Perfil de usuario nao autorizado' });
  return false;
}

async function findDocumentById(id, dbClient = client) {
  const result = await dbClient.query(
    'SELECT * FROM pregnant_documents WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

function encryptedFilePath() {
  return path.join(ENCRYPTED_STORAGE_DIR, `${crypto.randomUUID()}.mfe`);
}

const uploadDocument = async (req, res) => {
  const file = getUploadedFile(req);
  let storedPath;
  let dbClient;
  let committed = false;

  try {
    if (!file) return res.status(400).send('Nenhum arquivo enviado');
    const { pregnant_id, document_name } = req.body || {};
    const document_type = req.body?.document_type || file.mimetype || null;
    if (!pregnant_id || !document_name) {
      await cleanupUploadedFile(req);
      return res.status(400).json({
        error: 'pregnant_id e document_name sao obrigatorios',
      });
    }
    if (!(await ensureCanAccessPregnant(req, res, pregnant_id))) {
      await cleanupUploadedFile(req);
      return;
    }

    storedPath = encryptedFilePath();
    await fileCryptoService.encryptFile(
      file.path,
      storedPath,
      { pregnantId: pregnant_id }
    );
    await cleanupUploadedFile(req);

    const encryptedMetadata = cryptoService.encryptRecord(
      { document_name, document_type },
      'pregnant_documents'
    );
    dbClient = await client.connect();
    await dbClient.query('BEGIN');
    const result = await dbClient.query(
      `INSERT INTO pregnant_documents (
         pregnant_id, document_name, document_type, file_path,
         encryption_key_version, file_encryption_version
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        pregnant_id,
        encryptedMetadata.document_name,
        encryptedMetadata.document_type,
        storedPath,
        cryptoService.getCurrentVersion(),
        cryptoService.getCurrentVersion(),
      ]
    );
    await dbClient.query('COMMIT');
    committed = true;

    if (process.env.DISABLE_DOCUMENT_EXTRACTION_QUEUE !== 'true') {
      enqueueDocumentTextExtraction(result.rows[0].id);
    }
    return res.status(201).json({
      message: 'Documento enviado com seguranca; extracao de texto iniciada',
      document: sanitizeDocument(result.rows[0]),
    });
  } catch (error) {
    if (dbClient && !committed) {
      try {
        await dbClient.query('ROLLBACK');
      } catch (_) {
        // Ignore rollback errors.
      }
    }
    await cleanupUploadedFile(req);
    if (!committed) await removeFileIfExists(storedPath);
    logger.error('Erro ao enviar documento', { details: error.message });
    return res.status(500).json({ error: 'Erro ao enviar documento' });
  } finally {
    if (dbClient) dbClient.release();
  }
};

const getDocuments = async (req, res) => {
  const { pregnant_id } = req.query;
  if (!pregnant_id) {
    return res.status(400).json({ error: 'pregnant_id e obrigatorio' });
  }
  try {
    if (!(await ensureCanAccessPregnant(req, res, pregnant_id))) return;
    const result = await client.query(
      `SELECT * FROM pregnant_documents
        WHERE pregnant_id = $1 ORDER BY uploaded_at DESC`,
      [pregnant_id]
    );
    return res.json(result.rows.map(sanitizeDocument));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getDocumentById = async (req, res) => {
  try {
    const document = await findDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Documento nao encontrado' });
    }
    if (!(await ensureCanAccessPregnant(req, res, document.pregnant_id))) return;
    return res.json(sanitizeDocument(document));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const storedDocument = await findDocumentById(req.params.id);
    if (!storedDocument) {
      return res.status(404).json({ error: 'Documento nao encontrado' });
    }
    if (!(await ensureCanAccessPregnant(
      req,
      res,
      storedDocument.pregnant_id
    ))) return;

    const document = decryptDocument(storedDocument);
    const buffer = await fileCryptoService.readDecryptedFile(
      storedDocument.file_path,
      { pregnantId: storedDocument.pregnant_id }
    );
    res.attachment(document.document_name || `documento-${document.id}`);
    res.type(document.document_type || 'application/octet-stream');
    return res.send(buffer);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Arquivo do documento nao encontrado' });
    }
    logger.error('Erro ao baixar documento', { details: error.message });
    return res.status(500).json({ error: 'Erro ao baixar documento' });
  }
};

const deleteDocument = async (req, res) => {
  let dbClient;
  let tombstonePath;
  let originalPath;
  let committed = false;

  try {
    const document = await findDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Documento nao encontrado' });
    }
    if (!(await ensureCanAccessPregnant(req, res, document.pregnant_id))) return;

    originalPath = document.file_path;
    if (originalPath) {
      tombstonePath = `${originalPath}.delete-${crypto.randomUUID()}`;
      try {
        await fs.rename(originalPath, tombstonePath);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        tombstonePath = null;
      }
    }

    dbClient = await client.connect();
    await dbClient.query('BEGIN');
    await dbClient.query(
      'DELETE FROM pregnant_documents WHERE id = $1',
      [req.params.id]
    );
    await dbClient.query('COMMIT');
    committed = true;
    try {
      await removeFileIfExists(tombstonePath);
    } catch (error) {
      logger.error('Documento removido, mas limpeza do arquivo falhou', {
        details: error.message,
        tombstonePath,
      });
    }
    return res.json({ message: 'Documento removido com sucesso' });
  } catch (error) {
    if (dbClient && !committed) {
      try {
        await dbClient.query('ROLLBACK');
      } catch (_) {
        // Ignore rollback errors.
      }
    }
    if (!committed && tombstonePath && originalPath) {
      try {
        await fs.rename(tombstonePath, originalPath);
      } catch (_) {
        // Preserve the original failure for logging.
      }
    }
    logger.error('Erro ao remover documento', { details: error.message });
    return res.status(500).json({ error: 'Erro ao remover documento' });
  } finally {
    if (dbClient) dbClient.release();
  }
};

const updateDocument = async (req, res) => {
  try {
    const document = await findDocumentById(req.params.id);
    if (!document) return res.status(404).send('Documento nao encontrado');
    if (!(await ensureCanAccessPregnant(req, res, document.pregnant_id))) return;

    const updateData = Object.fromEntries(
      Object.entries(req.body || {}).filter(
        ([field, value]) => ALLOWED_DOCUMENT_UPDATE_FIELDS.includes(field) &&
          value !== undefined
      )
    );
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'Nenhum campo valido para atualizar',
      });
    }
    const encrypted = cryptoService.encryptRecord(
      updateData,
      'pregnant_documents'
    );
    encrypted.encryption_key_version = cryptoService.getCurrentVersion();
    const entries = Object.entries(encrypted);
    const setClause = entries
      .map(([field], index) => `${field} = $${index + 1}`)
      .join(', ');
    const result = await client.query(
      `UPDATE pregnant_documents
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${entries.length + 1}
        RETURNING *`,
      [...entries.map(([, value]) => value), req.params.id]
    );
    return res.json(sanitizeDocument(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getDocumentExtractedText = async (req, res) => {
  try {
    const storedDocument = await findDocumentById(req.params.id);
    if (!storedDocument) {
      return res.status(404).json({ error: 'Documento nao encontrado' });
    }
    if (!(await ensureCanAccessPregnant(
      req,
      res,
      storedDocument.pregnant_id
    ))) return;
    const document = decryptDocument(storedDocument);

    if (document.extraction_status !== 'done') {
      return res.status(202).json({
        document_id: document.id,
        extraction_status: document.extraction_status,
        extraction_error: document.extraction_error,
      });
    }
    return res.json({
      document_id: document.id,
      extraction_status: document.extraction_status,
      extraction_method: document.extraction_method,
      extraction_confidence: document.extraction_confidence,
      extraction_error: document.extraction_error,
      extraction_attempts: document.extraction_attempts,
      extracted_at: document.extracted_at,
      extracted_text: document.extracted_text,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const retryDocumentTextExtraction = async (req, res) => {
  try {
    const document = await findDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Documento nao encontrado' });
    }
    if (!(await ensureCanAccessPregnant(req, res, document.pregnant_id))) return;
    processDocumentTextExtraction(document.id).catch((error) => {
      logger.error('Erro inesperado ao reprocessar documento', {
        details: error.message,
        documentId: document.id,
      });
    });
    return res.status(202).json({
      message: 'Documento enviado para reprocessamento de texto',
      document_id: document.id,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  deleteDocument,
  downloadDocument,
  ensureCanAccessPregnant,
  findDocumentById,
  getDocumentById,
  getDocumentExtractedText,
  getDocuments,
  retryDocumentTextExtraction,
  sanitizeDocument,
  updateDocument,
  uploadDocument,
};
