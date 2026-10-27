/**
 * Consentimento LGPD (E7-01.1).
 *
 * Endpoints:
 *   - GET  /policy : finalidades, versões vigentes e texto do termo (público, usado no cadastro).
 *   - GET  /me     : status de consentimento do usuário autenticado.
 *   - POST /       : registra aceite, recusa ou revogação do usuário autenticado.
 */
const express = require('express');
const router = express.Router();
const {
  getConsentPolicy,
  getMyConsents,
  recordMyConsent,
} = require('../controllers/consentController');
const { authenticateToken } = require('../middlewares/auth');
const { createAuthLimiters } = require('../middlewares/authRateLimit');

const { clinicalLimiter } = createAuthLimiters();

router.get('/policy', getConsentPolicy);
router.get('/me', clinicalLimiter, authenticateToken, getMyConsents);
router.post('/', clinicalLimiter, authenticateToken, recordMyConsent);

module.exports = router;
