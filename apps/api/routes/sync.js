const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// Rota principal para sincronização de dados
router.post('/', authenticateToken, requireRole('admin'), syncController.syncData);

module.exports = router;

// app.use('/api/sync', syncRoutes);
