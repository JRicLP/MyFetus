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
  getDocumentExtractedText,
  retryDocumentTextExtraction,
} = require('../controllers/documentsController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: Number(process.env.DOCUMENT_MAX_UPLOAD_BYTES || 25 * 1024 * 1024),
  },
});
const requireDocumentAccess = [authenticateToken, requireRole('medico', 'admin')];

router.post(
  '/',
  requireDocumentAccess,
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'document', maxCount: 1 },
  ]),
  uploadDocument
);
router.get('/', requireDocumentAccess, getDocuments); // lista por pregnant_id (query param)
router.get('/:id/download', requireDocumentAccess, downloadDocument);
router.get('/:id/text', requireDocumentAccess, getDocumentExtractedText);
router.post('/:id/extract', requireDocumentAccess, retryDocumentTextExtraction);
router.get('/:id', requireDocumentAccess, getDocumentById); // busca o doc por id
router.delete('/:id', requireDocumentAccess, deleteDocument);
router.put('/:id', requireDocumentAccess, updateDocument);

module.exports = router;
