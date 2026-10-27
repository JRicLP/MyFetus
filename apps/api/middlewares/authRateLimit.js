const { rateLimit } = require('express-rate-limit');
const { audit } = require('../services/auditService');

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createLimiterOptions(windowMs, limit, action, resource) {
  return {
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: 'Muitas tentativas. Tente novamente mais tarde.',
    },
    handler(req, res, _next, limiterOptions) {
      audit(req, {
        action,
        resource,
        outcome: 'FAILURE',
        detail: { path: req.originalUrl, method: req.method },
      });
      return res.status(limiterOptions.statusCode).json(limiterOptions.message);
    },
  };
}

function createLoginLimiterOptions(options = {}) {
  const windowMs = positiveInteger(
    options.windowMs ?? process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  );
  const loginMax = positiveInteger(
    options.loginMax ?? process.env.AUTH_RATE_LIMIT_MAX,
    10
  );
  return createLimiterOptions(windowMs, loginMax, 'USER_LOGIN_BLOCKED', 'users');
}

function createRegisterLimiterOptions(options = {}) {
  const windowMs = positiveInteger(
    options.windowMs ?? process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  );
  const registerMax = positiveInteger(
    options.registerMax ?? process.env.REGISTER_RATE_LIMIT_MAX,
    5
  );
  return createLimiterOptions(windowMs, registerMax, 'USER_REGISTER_BLOCKED', 'users');
}

function createAdminReadLimiterOptions(options = {}) {
  const windowMs = positiveInteger(
    options.windowMs ?? process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  );
  const adminReadMax = positiveInteger(
    options.adminReadMax ?? process.env.ADMIN_READ_RATE_LIMIT_MAX,
    100
  );
  return createLimiterOptions(windowMs, adminReadMax, 'ADMIN_READ_BLOCKED', 'users');
}

function createClinicalLimiterOptions(options = {}) {
  const windowMs = positiveInteger(
    options.windowMs ?? process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  );
  const clinicalMax = positiveInteger(
    options.clinicalMax ?? process.env.CLINICAL_RATE_LIMIT_MAX,
    60
  );

  return createLimiterOptions(windowMs, clinicalMax, 'CLINICAL_READ_BLOCKED', 'clinical_data');
}

function createApiLimiterOptions(options = {}) {
  const windowMs = positiveInteger(
    options.windowMs ?? process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  );
  const apiMax = positiveInteger(
    options.apiMax ?? process.env.API_RATE_LIMIT_MAX,
    300
  );
  return createLimiterOptions(windowMs, apiMax, 'API_RATE_LIMIT_BLOCKED', 'api');
}

function createRagLimiterOptions(options = {}) {
  const windowMs = positiveInteger(
    options.windowMs ?? process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  );
  const ragMax = positiveInteger(
    options.ragMax ?? process.env.RAG_RATE_LIMIT_MAX,
    20
  );

  return createLimiterOptions(windowMs, ragMax, 'RAG_RATE_LIMIT_BLOCKED', 'rag');
}

// Exportação confere senha e gera um arquivo grande: limite baixo por janela.
function createDataExportLimiterOptions(options = {}) {
  const windowMs = positiveInteger(
    options.windowMs ?? process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  );
  const exportMax = positiveInteger(
    options.exportMax ?? process.env.DATA_EXPORT_RATE_LIMIT_MAX,
    5
  );
  return createLimiterOptions(windowMs, exportMax, 'DATA_EXPORT_BLOCKED', 'users');
}

// Exclusão da conta confere senha e é irreversível: limite baixo por janela.
function createAccountDeletionLimiterOptions(options = {}) {
  const windowMs = positiveInteger(
    options.windowMs ?? process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  );
  const deletionMax = positiveInteger(
    options.deletionMax ?? process.env.ACCOUNT_DELETION_RATE_LIMIT_MAX,
    5
  );
  return createLimiterOptions(windowMs, deletionMax, 'ACCOUNT_DELETION_BLOCKED', 'users');
}

function createAuthLimiters(options = {}) {
  return {
    loginLimiter: rateLimit(createLoginLimiterOptions(options)),
    registerLimiter: rateLimit(createRegisterLimiterOptions(options)),
    adminReadLimiter: rateLimit(createAdminReadLimiterOptions(options)),
    clinicalLimiter: rateLimit(createClinicalLimiterOptions(options)),
    apiLimiter: rateLimit(createApiLimiterOptions(options)),
    ragLimiter: rateLimit(createRagLimiterOptions(options)),
  };
}

const defaultLimiters = createAuthLimiters();

module.exports = {
  createLimiterOptions,
  createLoginLimiterOptions,
  createRegisterLimiterOptions,
  createAdminReadLimiterOptions,
  createClinicalLimiterOptions,
  createApiLimiterOptions,
  createRagLimiterOptions,
  createDataExportLimiterOptions,
  createAccountDeletionLimiterOptions,
  createAuthLimiters,
  positiveInteger,
  ...defaultLimiters,
};
