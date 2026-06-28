const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const auth = require('../middlewares/auth'); // Importante: manter segurança

router.post('/maternal-analysis', auth, agentController.handleMaternalAnalysis);

module.exports = router;