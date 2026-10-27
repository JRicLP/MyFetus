/**
 * rag.js
 * 
 * Rotas para o sistema RAG (Retrieval-Augmented Generation)
 * Endpoints de busca semântica e consulta ao knowledge base
 */

const express = require('express');
const router = express.Router();

const { rateLimit } = require('express-rate-limit');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { createApiLimiterOptions } = require('../middlewares/authRateLimit');
const {
  askClinicalAgentsChat,
  searchKnowledgeBase,
  askClinicalChat,
  getRAGStats,
} = require('../controllers/ragController');

router.use(rateLimit(createApiLimiterOptions()));

// Busca semântica no knowledge base (requer autenticação)
router.post('/search', authenticateToken, searchKnowledgeBase);

// Chat clínico: retrieval + geração de resposta em linguagem natural (requer autenticação)
router.post('/chat', authenticateToken, askClinicalChat);
router.post('/chat/agents', authenticateToken, askClinicalAgentsChat);

// Estatísticas do RAG (admin only)
router.get('/stats', authenticateToken, requireRole('admin'), getRAGStats);

module.exports = router;
