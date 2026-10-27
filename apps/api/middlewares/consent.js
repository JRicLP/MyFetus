const client = require('../backend');
const logger = require('../utils/logger');
const { authenticateToken } = require('./auth');
const { getConsentStatus } = require('../services/consentService');

function normalizedPath(req) {
  const path = req.path || req.originalUrl || '';
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

function isConsentExempt(req) {
  const path = normalizedPath(req);
  const method = req.method.toUpperCase();

  return (
    (method === 'POST' && (path === '/api/users' || path === '/api/doctors')) ||
    (path === '/api/users/login') ||
    path === '/api/consents' ||
    path === '/api/consents/me' ||
    (method === 'GET' && path === '/api/consents/policy') ||
    // Direitos do titular (E7-02.1) valem mesmo sem consentimento vigente.
    (method === 'POST' && (path === '/api/privacy/export' || path === '/api/privacy/delete'))
  );
}

function sendConsentRequired(res, pending) {
  return res.status(428).json({
    error: 'Consentimento vigente necessário',
    code: 'CONSENT_REQUIRED',
    pending,
  });
}

/**
 * Autentica requisições da API que já carregam token e bloqueia uso clínico
 * quando há finalidade obrigatória sem aceite vigente. Cadastro, login e os
 * endpoints de leitura/registro do próprio consentimento ficam liberados para
 * permitir a regularização da conta.
 */
function requireCurrentConsent(req, res, next) {
  if (!req.path.startsWith('/api') || isConsentExempt(req) || !req.headers.authorization) {
    return next();
  }

  return authenticateToken(req, res, async () => {
    try {
      const status = await getConsentStatus(client, {
        userId: req.user.id,
        role: req.user.role,
      });

      if (status.required) return sendConsentRequired(res, status.pending);

      req.consentChecked = true;
      return next();
    } catch (error) {
      logger.error('Erro ao verificar consentimento vigente', {
        code: 'CONSENT_STATUS_UNAVAILABLE',
        details: error.message,
      });
      return res.status(503).json({
        error: 'Status de consentimento indisponível',
        code: 'CONSENT_STATUS_UNAVAILABLE',
      });
    }
  });
}

module.exports = {
  isConsentExempt,
  requireCurrentConsent,
  sendConsentRequired,
};
