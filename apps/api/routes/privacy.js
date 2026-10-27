/**
 * Direitos do titular (E7-02.1, LGPD art. 18).
 *
 * Endpoints:
 *   - POST /export : exporta em JSON os dados do usuário autenticado, após
 *                    confirmação da senha.
 *   - POST /delete : exclui (gestante) ou anonimiza (médico) a conta do usuário
 *                    autenticado, após senha e a palavra EXCLUIR.
 *
 * Observações:
 *   - Limites próprios e baixos, porque as rotas conferem senha.
 *   - Fica fora do bloqueio por consentimento (middlewares/consent.js): quem
 *     revogou o consentimento continua podendo exercer seus direitos.
 */
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const router = express.Router();
const { deleteMyAccount, exportMyData } = require('../controllers/privacyController');
const { authenticateToken } = require('../middlewares/auth');
const {
  createAccountDeletionLimiterOptions,
  createDataExportLimiterOptions,
} = require('../middlewares/authRateLimit');

const exportLimiter = rateLimit(createDataExportLimiterOptions());
const deletionLimiter = rateLimit(createAccountDeletionLimiterOptions());

router.post('/export', exportLimiter, authenticateToken, exportMyData);
router.post('/delete', deletionLimiter, authenticateToken, deleteMyAccount);

module.exports = router;
