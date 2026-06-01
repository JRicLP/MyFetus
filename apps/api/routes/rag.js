/**
 * rag.js
 * 
 * Rotas para o sistema RAG (Retrieval-Augmented Generation)
 * Endpoints de busca semântica e consulta ao knowledge base
 */

const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middlewares/auth');
const { searchKnowledgeBase, getRAGStats } = require('../controllers/ragController');

// Busca semântica no knowledge base (requer autenticação)
router.post('/search', authenticateToken, searchKnowledgeBase);

// Estatísticas do RAG (admin only)
router.get('/stats', authenticateToken, requireRole('admin'), getRAGStats);

module.exports = router;
