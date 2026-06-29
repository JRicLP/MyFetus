const { rateLimit } = require('express-rate-limit');
const { audit } = require('../services/auditService');

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createAuthLimiters(options = {}) {
  const windowMs = positiveInteger(
    options.windowMs ?? process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  );
  const loginMax = positiveInteger(
    options.loginMax ?? process.env.AUTH_RATE_LIMIT_MAX,
    10
  );
  const registerMax = positiveInteger(
    options.registerMax ?? process.env.REGISTER_RATE_LIMIT_MAX,
    5
  );
  const adminReadMax = positiveInteger(
    options.adminReadMax ?? process.env.ADMIN_READ_RATE_LIMIT_MAX,
    100
  );
  const common = {
    windowMs,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: 'Muitas tentativas. Tente novamente mais tarde.',
    },
    handler(req, res, _next, options) {
      audit(req, {
        action: 'USER_LOGIN_BLOCKED',
        resource: 'users',
        outcome: 'FAILURE',
        detail: { path: req.originalUrl, method: req.method },
      });
      return res.status(options.statusCode).json(options.message);
    },
  };

  return {
    loginLimiter: rateLimit({ ...common, limit: loginMax }),
    registerLimiter: rateLimit({ ...common, limit: registerMax }),
    adminReadLimiter: rateLimit({ ...common, limit: adminReadMax }),
  };
}

module.exports = {
  createAuthLimiters,
  positiveInteger,
};
