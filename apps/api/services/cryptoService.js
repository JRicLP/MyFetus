const crypto = require('crypto');
const { getEncryptedFields } = require('../config/dataClassification');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const ENVELOPE_PATTERN = /^v(\d+):([0-9a-f]{24}):([0-9a-f]+):([0-9a-f]{32})$/i;
const VERSION_PREFIX_PATTERN = /^v\d+:/;

function parseKey(hexKey, variableName) {
  if (!/^[0-9a-f]{64}$/i.test(hexKey || '')) {
    throw new Error(`${variableName} deve conter exatamente 64 caracteres hexadecimais`);
  }
  return Buffer.from(hexKey, 'hex');
}

function loadKeyring(env) {
  const currentVersion = Number(env.AES_KEY_VERSION || 1);
  if (!Number.isInteger(currentVersion) || currentVersion < 1) {
    throw new Error('AES_KEY_VERSION deve ser um inteiro positivo');
  }

  const keyring = new Map();
  for (const [name, value] of Object.entries(env)) {
    const match = name.match(/^AES_ENCRYPTION_KEY_V(\d+)$/);
    if (match && value) {
      keyring.set(Number(match[1]), parseKey(value, name));
    }
  }

  if (!keyring.has(currentVersion) && env.AES_ENCRYPTION_KEY) {
    keyring.set(
      currentVersion,
      parseKey(env.AES_ENCRYPTION_KEY, 'AES_ENCRYPTION_KEY')
    );
  }

  if (!keyring.has(currentVersion)) {
    throw new Error(
      `AES_ENCRYPTION_KEY_V${currentVersion} nao configurada para a versao atual`
    );
  }

  return { currentVersion, keyring };
}

function serialize(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error('Data invalida para criptografia');
    return JSON.stringify({ type: 'date', value: value.toISOString() });
  }
  if (typeof value === 'string') return JSON.stringify({ type: 'string', value });
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Numero invalido para criptografia');
    return JSON.stringify({ type: 'number', value });
  }
  if (typeof value === 'boolean') return JSON.stringify({ type: 'boolean', value });
  if (typeof value === 'object') return JSON.stringify({ type: 'json', value });
  throw new Error(`Tipo nao suportado para criptografia: ${typeof value}`);
}

function deserialize(serialized) {
  let payload;
  try {
    payload = JSON.parse(serialized);
  } catch (error) {
    throw new Error('Payload descriptografado possui formato invalido');
  }

  if (!payload || typeof payload !== 'object' || !('type' in payload)) {
    throw new Error('Payload descriptografado possui tipo invalido');
  }

  switch (payload.type) {
    case 'string':
      return String(payload.value);
    case 'number':
      if (typeof payload.value !== 'number') break;
      return payload.value;
    case 'boolean':
      if (typeof payload.value !== 'boolean') break;
      return payload.value;
    case 'date': {
      const date = new Date(payload.value);
      if (Number.isNaN(date.getTime())) break;
      return date;
    }
    case 'json':
      return payload.value;
    default:
      break;
  }

  throw new Error('Payload descriptografado possui valor invalido');
}

function buildAad(context = {}) {
  const table = context.table || '*';
  const field = context.field || '*';
  return Buffer.from(`myfetus:${table}:${field}`, 'utf8');
}

function isEncrypted(value) {
  return typeof value === 'string' && ENVELOPE_PATTERN.test(value);
}

function createCryptoService(options = {}) {
  const { currentVersion, keyring } = loadKeyring(options.env || process.env);
  const randomBytes = options.randomBytes || crypto.randomBytes;

  function encrypt(value, context = {}) {
    if (value === null || value === undefined) return value;
    if (isEncrypted(value)) return value;

    const key = keyring.get(currentVersion);
    const iv = randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_BYTES,
    });
    cipher.setAAD(buildAad(context));

    const ciphertext = Buffer.concat([
      cipher.update(serialize(value), 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      `v${currentVersion}`,
      iv.toString('hex'),
      ciphertext.toString('hex'),
      authTag.toString('hex'),
    ].join(':');
  }

  function decrypt(value, context = {}) {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'string') return value;
    if (!VERSION_PREFIX_PATTERN.test(value)) return value;

    const match = value.match(ENVELOPE_PATTERN);
    if (!match) throw new Error('Ciphertext possui formato invalido');

    const version = Number(match[1]);
    const key = keyring.get(version);
    if (!key) throw new Error(`Chave AES da versao ${version} nao configurada`);

    try {
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(match[2], 'hex'),
        { authTagLength: AUTH_TAG_BYTES }
      );
      decipher.setAAD(buildAad(context));
      decipher.setAuthTag(Buffer.from(match[4], 'hex'));

      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(match[3], 'hex')),
        decipher.final(),
      ]).toString('utf8');

      return deserialize(plaintext);
    } catch (error) {
      if (error.message.startsWith('Payload descriptografado')) throw error;
      throw new Error('Falha de autenticacao ao descriptografar dado');
    }
  }

  function transformRecord(record, table, transformer) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error('Registro deve ser um objeto');
    }

    const fields = getEncryptedFields(table);
    if (fields.length === 0) {
      throw new Error(`Tabela sem classificacao de criptografia: ${table}`);
    }

    const transformed = { ...record };
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(transformed, field)) {
        transformed[field] = transformer(transformed[field], { table, field });
      }
    }
    return transformed;
  }

  return Object.freeze({
    currentVersion,
    decrypt,
    decryptRecord(record, table) {
      return transformRecord(record, table, decrypt);
    },
    encrypt,
    encryptRecord(record, table) {
      return transformRecord(record, table, encrypt);
    },
    isEncrypted,
  });
}

let defaultService;

function getDefaultService() {
  if (!defaultService) defaultService = createCryptoService();
  return defaultService;
}

module.exports = {
  createCryptoService,
  decrypt(...args) {
    return getDefaultService().decrypt(...args);
  },
  decryptRecord(...args) {
    return getDefaultService().decryptRecord(...args);
  },
  encrypt(...args) {
    return getDefaultService().encrypt(...args);
  },
  encryptRecord(...args) {
    return getDefaultService().encryptRecord(...args);
  },
  getCurrentVersion() {
    return getDefaultService().currentVersion;
  },
  isEncrypted,
};
