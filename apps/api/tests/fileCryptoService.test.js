const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const {
  createFileCryptoService,
} = require('../services/fileCryptoService');

const service = createFileCryptoService({
  env: {
    AES_KEY_VERSION: '1',
    AES_ENCRYPTION_KEY_V1: '21'.repeat(32),
  },
});
const context = { pregnantId: 17 };
const plaintext = Buffer.from('conteudo clinico confidencial', 'utf8');
const encrypted = service.encryptBuffer(plaintext, context);

assert.ok(service.isEncryptedBuffer(encrypted));
assert.notDeepStrictEqual(encrypted, plaintext);
assert.deepStrictEqual(service.decryptBuffer(encrypted, context), plaintext);
assert.deepStrictEqual(service.decryptBuffer(plaintext, context), plaintext);
assert.throws(
  () => service.decryptBuffer(plaintext, context, { allowLegacy: false }),
  /nao esta criptografado/
);
assert.throws(
  () => service.decryptBuffer(encrypted, { pregnantId: 18 }),
  /Falha de autenticacao/
);

const tampered = Buffer.from(encrypted);
tampered[tampered.length - 17] ^= 0xff;
assert.throws(
  () => service.decryptBuffer(tampered, context),
  /Falha de autenticacao/
);

async function runFileRoundTrip() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'myfetus-file-'));
  const source = path.join(directory, 'source.txt');
  const target = path.join(directory, 'encrypted', 'document.mfe');
  try {
    await fs.writeFile(source, plaintext);
    await service.encryptFile(source, target, context);
    assert.deepStrictEqual(
      await service.readDecryptedFile(target, context),
      plaintext
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

runFileRoundTrip()
  .then(() => console.log('fileCryptoService: OK'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
