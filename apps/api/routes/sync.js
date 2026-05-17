const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

// Rota principal para sincronização de dados
router.post('/', syncController.syncData);

module.exports = router;

// app.use('/api/sync', syncRoutes);