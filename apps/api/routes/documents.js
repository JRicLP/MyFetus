/**
 * Rotas relacionadas à manipulação de documentos de gestantes.
 *
 * Definição:
 *   Fornece endpoints para upload, listagem, consulta, atualização e exclusão de documentos.
 *   Utiliza o controller `documentsController` para tratar as requisições.
 *
 * Endpoints:
 *   - POST   /         : Upload de um documento (campo 'file' ou 'document').
 *   - GET    /         : Lista documentos filtrando por `pregnant_id` (query param).
 *   - GET    /:id      : Consulta um documento específico pelo ID.
 *   - GET    /:id/download : Baixa um documento específico pelo ID.
 *   - GET    /:id/text : Consulta o texto extraído do documento.
 *   - POST   /:id/extract : Reprocessa a extração de texto.
 *   - PUT    /:id/report : Salva o laudo do médico e marca o documento como revisado.
 *   - DELETE /:id      : Remove um documento pelo ID.
 *   - PUT    /:id      : Atualiza informações de um documento pelo ID.
 *
 * Observações:
 *   - O upload de arquivos é realizado temporariamente na pasta 'uploads/' via `multer`.
 *   - As rotas utilizam `express.Router` para modularização.
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');

const {
  uploadDocument,
  getDocuments,
  getDocumentById,
  downloadDocument,
  deleteDocument,
  updateDocument,
  updateDocumentReport,
  getDocumentExtractedText,
  retryDocumentTextExtraction,
} = require('../controllers/documentsController');
const { rateLimit } = require('express-rate-limit');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { createApiLimiterOptions } = require('../middlewares/authRateLimit');

router.use(rateLimit(createApiLimiterOptions()));

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: Number(process.env.DOCUMENT_MAX_UPLOAD_BYTES || 25 * 1024 * 1024),
  },
});

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const documentUploadLimiter = rateLimit({
  windowMs: positiveInteger(
    process.env.DOCUMENT_UPLOAD_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  ),
  limit: positiveInteger(process.env.DOCUMENT_UPLOAD_RATE_LIMIT_MAX, 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const documentReadLimiter = rateLimit({
  windowMs: positiveInteger(
    process.env.DOCUMENT_READ_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  ),
  limit: positiveInteger(process.env.DOCUMENT_READ_RATE_LIMIT_MAX, 120),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const requireDocumentReadAccess = [
  documentReadLimiter,
  authenticateToken,
  requireRole('gestante', 'medico', 'admin'),
];
const requireDocumentManagement = [
  documentReadLimiter,
  authenticateToken,
  requireRole('medico', 'admin'),
];
router.post(
  '/',
  documentUploadLimiter,
  authenticateToken,
  requireRole('gestante', 'medico', 'admin'),
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'document', maxCount: 1 },
  ]),
  uploadDocument
);
router.get('/', requireDocumentReadAccess, getDocuments);
router.get('/:id/download', requireDocumentReadAccess, downloadDocument);
router.get('/:id/text', requireDocumentManagement, getDocumentExtractedText);
router.post('/:id/extract', requireDocumentManagement, retryDocumentTextExtraction);
router.get('/:id', requireDocumentManagement, getDocumentById);
router.put('/:id/report', requireDocumentManagement, updateDocumentReport);
router.delete('/:id', requireDocumentManagement, deleteDocument);
router.put('/:id', requireDocumentManagement, updateDocument);

module.exports = router;
