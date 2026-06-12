const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const ALGORITHM = 'aes-256-gcm';
const MAGIC = Buffer.from('MFENC001', 'ascii');
const VERSION_BYTES = 4;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + VERSION_BYTES + IV_BYTES;

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

function buildAad(context = {}) {
  if (!context.pregnantId) {
    throw new Error('pregnantId e obrigatorio para criptografia de arquivo');
  }
  return Buffer.from(
    `myfetus:pregnant_documents:file:${context.pregnantId}`,
    'utf8'
  );
}

function isEncryptedBuffer(buffer) {
  return (
    Buffer.isBuffer(buffer) &&
    buffer.length >= HEADER_BYTES + TAG_BYTES &&
    buffer.subarray(0, MAGIC.length).equals(MAGIC)
  );
}

function createFileCryptoService(options = {}) {
  const { currentVersion, keyring } = loadKeyring(options.env || process.env);
  const randomBytes = options.randomBytes || crypto.randomBytes;

  function encryptBuffer(plaintext, context) {
    if (!Buffer.isBuffer(plaintext)) {
      throw new TypeError('Conteudo do arquivo deve ser um Buffer');
    }
    if (isEncryptedBuffer(plaintext)) return plaintext;

    const iv = randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      keyring.get(currentVersion),
      iv
    );
    cipher.setAAD(buildAad(context));
    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);
    const version = Buffer.alloc(VERSION_BYTES);
    version.writeUInt32BE(currentVersion);

    return Buffer.concat([
      MAGIC,
      version,
      iv,
      ciphertext,
      cipher.getAuthTag(),
    ]);
  }

  function decryptBuffer(payload, context, options = {}) {
    if (!Buffer.isBuffer(payload)) {
      throw new TypeError('Conteudo do arquivo deve ser um Buffer');
    }
    if (!isEncryptedBuffer(payload)) {
      if (options.allowLegacy === false) {
        throw new Error('Arquivo nao esta criptografado');
      }
      return payload;
    }

    const version = payload.readUInt32BE(MAGIC.length);
    const key = keyring.get(version);
    if (!key) throw new Error(`Chave AES da versao ${version} nao configurada`);

    const ivStart = MAGIC.length + VERSION_BYTES;
    const ciphertextEnd = payload.length - TAG_BYTES;
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      payload.subarray(ivStart, ivStart + IV_BYTES)
    );
    decipher.setAAD(buildAad(context));
    decipher.setAuthTag(payload.subarray(ciphertextEnd));

    try {
      return Buffer.concat([
        decipher.update(payload.subarray(HEADER_BYTES, ciphertextEnd)),
        decipher.final(),
      ]);
    } catch (_) {
      throw new Error('Falha de autenticacao ao descriptografar arquivo');
    }
  }

  async function readDecryptedFile(filePath, context, options = {}) {
    return decryptBuffer(await fs.readFile(filePath), context, options);
  }

  async function encryptFile(sourcePath, targetPath, context) {
    const encrypted = encryptBuffer(await fs.readFile(sourcePath), context);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const temporaryPath = `${targetPath}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporaryPath, encrypted, { flag: 'wx', mode: 0o600 });
      await fs.rename(temporaryPath, targetPath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true });
      throw error;
    }
    return targetPath;
  }

  return Object.freeze({
    currentVersion,
    decryptBuffer,
    encryptBuffer,
    encryptFile,
    isEncryptedBuffer,
    readDecryptedFile,
  });
}

let defaultService;

function getDefaultService() {
  if (!defaultService) defaultService = createFileCryptoService();
  return defaultService;
}

module.exports = {
  createFileCryptoService,
  decryptBuffer(...args) {
    return getDefaultService().decryptBuffer(...args);
  },
  encryptBuffer(...args) {
    return getDefaultService().encryptBuffer(...args);
  },
  encryptFile(...args) {
    return getDefaultService().encryptFile(...args);
  },
  isEncryptedBuffer,
  readDecryptedFile(...args) {
    return getDefaultService().readDecryptedFile(...args);
  },
};
