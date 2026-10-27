const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { createApiLimiterOptions } = require('../middlewares/authRateLimit');
const { listAuditLogs } = require('../controllers/auditController');

router.use(rateLimit(createApiLimiterOptions()));

router.get('/', authenticateToken, requireRole('admin'), listAuditLogs);

module.exports = router;
