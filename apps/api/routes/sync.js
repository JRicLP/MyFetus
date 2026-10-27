const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const syncController = require('../controllers/syncController');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { createApiLimiterOptions } = require('../middlewares/authRateLimit');

router.use(rateLimit(createApiLimiterOptions()));

// Rota principal para sincronização de dados
router.post('/', authenticateToken, requireRole('admin'), syncController.syncData);

module.exports = router;

// app.use('/api/sync', syncRoutes);
