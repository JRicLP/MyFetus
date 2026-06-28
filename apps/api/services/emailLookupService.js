const crypto = require('crypto');

const MINIMUM_KEY_BYTES = 32;

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    throw new TypeError('Email must be a string');
  }

  return email.trim().toLowerCase();
}

function parseHmacKey(rawKey) {
  if (!rawKey) {
    throw new Error('EMAIL_LOOKUP_HMAC_KEY is required');
  }
  if (!/^[0-9a-fA-F]+$/.test(rawKey) || rawKey.length % 2 !== 0) {
    throw new Error('EMAIL_LOOKUP_HMAC_KEY must be a hexadecimal value');
  }

  const key = Buffer.from(rawKey, 'hex');
  if (key.length < MINIMUM_KEY_BYTES) {
    throw new Error('EMAIL_LOOKUP_HMAC_KEY must contain at least 32 bytes');
  }
  return key;
}

function createEmailLookupService(options = {}) {
  const key = parseHmacKey(options.key || process.env.EMAIL_LOOKUP_HMAC_KEY);

  return {
    hash(email) {
      return crypto
        .createHmac('sha256', key)
        .update(normalizeEmail(email), 'utf8')
        .digest('hex');
    },
    normalize: normalizeEmail,
  };
}

let defaultService;

function getDefaultService() {
  if (!defaultService) {
    defaultService = createEmailLookupService();
  }
  return defaultService;
}

module.exports = {
  createEmailLookupService,
  hashEmail: (email) => getDefaultService().hash(email),
  normalizeEmail,
};
