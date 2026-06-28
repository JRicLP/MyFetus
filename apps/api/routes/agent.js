const express = require('express');
const router = express.Router();

// 1. Importação CORRETA do controller
const agentController = require('../controllers/agentController');

// 2. Importação CORRETA do middleware (usando desestruturação)
const { authenticateToken } = require('../middlewares/auth');

// 3. Rota usando a função 'authenticateToken'
router.post('/maternal-analysis', authenticateToken, agentController.handleMaternalAnalysis);

module.exports = router;