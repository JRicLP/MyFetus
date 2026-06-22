const crypto = require('crypto');
const path = require('path');
const { readEnvFile, updateEnvValue } = require('./env-file');

const envPath = process.env.ENV_FILE_PATH
  ? path.resolve(process.env.ENV_FILE_PATH)
  : path.resolve(__dirname, '../../../.env');
const rotate = process.argv.includes('--rotate');

function readValue(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : '';
}

function ensureSecret(key) {
  const content = readEnvFile(envPath);
  const current = readValue(content, key);
  if (!rotate && /^[0-9a-fA-F]{64}$/.test(current)) return false;

  updateEnvValue(envPath, key, crypto.randomBytes(32).toString('hex'));
  return true;
}

const aesChanged = ensureSecret('AES_ENCRYPTION_KEY_V1');
const hmacChanged = ensureSecret('EMAIL_LOOKUP_HMAC_KEY');
const content = readEnvFile(envPath);
if (!readValue(content, 'AES_KEY_VERSION')) {
  updateEnvValue(envPath, 'AES_KEY_VERSION', '1');
}

console.log(
  `Chaves de protecao configuradas (AES: ${aesChanged ? 'nova' : 'existente'}, HMAC: ${hmacChanged ? 'nova' : 'existente'}).`
);
