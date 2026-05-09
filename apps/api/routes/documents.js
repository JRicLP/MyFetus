/**
 * Rotas relacionadas à manipulação de documentos de gestantes.
 *
 * Definição:
 *   Fornece endpoints para upload, listagem, consulta, atualização e exclusão de documentos.
 *   Utiliza o controller `documentsController` para tratar as requisições.
 *
 * Endpoints:
 *   - POST   /documents         : Upload de um documento (campo 'document').
 *   - GET    /documents         : Lista documentos filtrando por `pregnant_id` (query param).
 *   - GET    /documents/:id     : Consulta um documento específico pelo ID.
 *   - DELETE /documents/:id     : Remove um documento pelo ID.
 *   - PUT    /documents/:id     : Atualiza informações de um documento pelo ID.
 *
 * Observações:
 *   - O upload de arquivos é realizado temporariamente na pasta 'uploads/' via `multer`.
 *   - As rotas utilizam `express.Router` para modularização.
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');

const { uploadDocument, getDocuments, getDocumentById, deleteDocument, updateDocument } = require('../controllers/documentsController');

const upload = multer({ dest: 'uploads/' }); // pasta para salvar arquivos temporariamente

router.post('/documents', upload.single('document'), uploadDocument);
router.get('/documents', getDocuments); // lista por pregnant_id (query param)
router.get('/documents/:id', getDocumentById); // busca o doc por id
router.delete('/documents/:id', deleteDocument);
router.put('/documents/:id', updateDocument);

module.exports = router;