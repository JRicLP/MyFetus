const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { listAuditLogs } = require('../controllers/auditController');

router.get('/', authenticateToken, requireRole('admin'), listAuditLogs);

module.exports = router;
