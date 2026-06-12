function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseTrustProxy(value) {
  if (value === undefined || value === null || value === '') return '';
  if (/^\d+$/.test(String(value))) return Number(value);
  return value;
}

function getSecurityConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const jwtSecret = env.JWT_SECRET;

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET deve possuir ao menos 32 caracteres');
  }

  return {
    enforceHttps: parseBoolean(env.ENFORCE_HTTPS, production),
    hstsMaxAge: Number(env.HSTS_MAX_AGE_SECONDS || 31536000),
    trustProxy: parseTrustProxy(env.TRUST_PROXY || (production ? '1' : '')),
  };
}

function requireHttps(config) {
  return (req, res, next) => {
    if (req.secure) {
      res.setHeader(
        'Strict-Transport-Security',
        `max-age=${config.hstsMaxAge}; includeSubDomains`
      );
      return next();
    }

    if (config.enforceHttps) {
      return res.status(426).json({ error: 'HTTPS obrigatorio' });
    }

    return next();
  };
}

module.exports = {
  getSecurityConfig,
  parseBoolean,
  parseTrustProxy,
  requireHttps,
};
