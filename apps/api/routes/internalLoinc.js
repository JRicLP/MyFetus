const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middlewares/auth');
const { mapSingleTerm, mapTextBlock } = require('../controllers/internalLoincController');

router.post('/term', authenticateToken, requireRole('admin'), mapSingleTerm);
router.post('/text', authenticateToken, requireRole('admin'), mapTextBlock);

module.exports = router;