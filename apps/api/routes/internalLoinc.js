const express = require('express');
const router = express.Router();

const { rateLimit } = require('express-rate-limit');
const { createApiLimiterOptions } = require('../middlewares/authRateLimit');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { mapSingleTerm, mapTextBlock } = require('../controllers/internalLoincController');

router.use(rateLimit(createApiLimiterOptions()));

router.post('/term', authenticateToken, requireRole('admin'), mapSingleTerm);
router.post('/text', authenticateToken, requireRole('admin'), mapTextBlock);

module.exports = router;