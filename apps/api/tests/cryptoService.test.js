const assert = require('assert');
const crypto = require('crypto');
const cryptoServiceModule = require('../services/cryptoService');
const {
  createCryptoService,
  isEncrypted,
} = cryptoServiceModule;
const {
  ENCRYPTED_FIELDS,
  getEncryptedFields,
} = require('../config/dataClassification');

const KEY_V1 = crypto.randomBytes(32).toString('hex');
const KEY_V2 = crypto.randomBytes(32).toString('hex');

function createService(version = 1, extraEnv = {}) {
  return createCryptoService({
    env: {
      AES_KEY_VERSION: String(version),
      AES_ENCRYPTION_KEY_V1: KEY_V1,
      ...extraEnv,
    },
  });
}

function encryptRaw(serialized, keyHex, context = {}) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
  cipher.setAAD(Buffer.from(
    `myfetus:${context.table || '*'}:${context.field || '*'}`,
    'utf8'
  ));
  const ciphertext = Buffer.concat([
    cipher.update(serialized, 'utf8'),
    cipher.final(),
  ]);
  return [
    'v1',
    iv.toString('hex'),
    ciphertext.toString('hex'),
    cipher.getAuthTag().toString('hex'),
  ].join(':');
}

const service = createService();

const encryptedString = service.encrypt('dado sensivel');
assert.match(encryptedString, /^v1:[0-9a-f]{24}:[0-9a-f]+:[0-9a-f]{32}$/);
assert.strictEqual(isEncrypted(encryptedString), true);
assert.strictEqual(service.decrypt(encryptedString), 'dado sensivel');

assert.strictEqual(service.encrypt(null), null);
assert.strictEqual(service.encrypt(undefined), undefined);
assert.strictEqual(service.decrypt(null), null);
assert.strictEqual(service.decrypt('valor legado'), 'valor legado');

const values = [
  123,
  36.7,
  true,
  false,
  '',
  { nested: ['value', 10] },
];

for (const value of values) {
  assert.deepStrictEqual(service.decrypt(service.encrypt(value)), value);
}

const originalDate = new Date('2026-06-11T12:30:00.000Z');
const decryptedDate = service.decrypt(service.encrypt(originalDate));
assert.ok(decryptedDate instanceof Date);
assert.strictEqual(decryptedDate.toISOString(), originalDate.toISOString());

const first = service.encrypt('mesmo valor');
const second = service.encrypt('mesmo valor');
assert.notStrictEqual(first, second);
assert.strictEqual(service.encrypt(first), first);

const tamperedParts = encryptedString.split(':');
tamperedParts[3] = `${tamperedParts[3].slice(0, -1)}${
  tamperedParts[3].endsWith('0') ? '1' : '0'
}`;
assert.throws(
  () => service.decrypt(tamperedParts.join(':')),
  /Falha de autenticacao/
);
assert.throws(
  () => service.decrypt('v1:invalid'),
  /formato invalido/
);
assert.throws(() => service.encrypt(Symbol('invalid')), /Tipo nao suportado/);
assert.throws(() => service.encrypt(Number.POSITIVE_INFINITY), /Numero invalido/);
assert.throws(() => service.encrypt(new Date('invalid')), /Data invalida/);
assert.throws(() => service.encryptRecord(null, 'users'), /Registro deve ser/);

for (const invalidPayload of [
  'not-json',
  JSON.stringify({ value: 'missing-type' }),
  JSON.stringify({ type: 'number', value: 'wrong' }),
  JSON.stringify({ type: 'boolean', value: 'wrong' }),
  JSON.stringify({ type: 'date', value: 'wrong' }),
  JSON.stringify({ type: 'unknown', value: 'wrong' }),
]) {
  assert.throws(
    () => service.decrypt(encryptRaw(invalidPayload, KEY_V1)),
    /Payload descriptografado/
  );
}

const fieldBound = service.encrypt('Maria', {
  table: 'users',
  field: 'name',
});
assert.strictEqual(
  service.decrypt(fieldBound, { table: 'users', field: 'name' }),
  'Maria'
);
assert.throws(
  () => service.decrypt(fieldBound, { table: 'users', field: 'email' }),
  /Falha de autenticacao/
);

const user = {
  id: 1,
  name: 'Maria Silva',
  email: 'maria@example.com',
  birthdate: '1990-01-02',
  role: 'gestante',
};
const encryptedUser = service.encryptRecord(user, 'users');
assert.strictEqual(encryptedUser.id, user.id);
assert.strictEqual(encryptedUser.role, user.role);
assert.ok(isEncrypted(encryptedUser.name));
assert.ok(isEncrypted(encryptedUser.email));
assert.ok(isEncrypted(encryptedUser.birthdate));
assert.deepStrictEqual(service.decryptRecord(encryptedUser, 'users'), user);

const pregnant = {
  id: 2,
  user_id: 1,
  altura: 1.65,
  antecedentes_diabetes: false,
  vacina_covid19_1dose: new Date('2025-01-10T00:00:00.000Z'),
  info_gerais_sintomas: 'Sem sintomas',
};
const pregnantRoundTrip = service.decryptRecord(
  service.encryptRecord(pregnant, 'pregnants'),
  'pregnants'
);
assert.strictEqual(pregnantRoundTrip.altura, 1.65);
assert.strictEqual(pregnantRoundTrip.antecedentes_diabetes, false);
assert.strictEqual(
  pregnantRoundTrip.vacina_covid19_1dose.toISOString(),
  pregnant.vacina_covid19_1dose.toISOString()
);
assert.strictEqual(pregnantRoundTrip.info_gerais_sintomas, 'Sem sintomas');

const pregnancy = {
  id: 3,
  pregnant_id: 2,
  weeks: 20,
  is_checked: true,
  dum: '2026-01-01',
  glicemia: 92,
};
assert.deepStrictEqual(
  service.decryptRecord(
    service.encryptRecord(pregnancy, 'pregnancies'),
    'pregnancies'
  ),
  pregnancy
);

const additionalRecords = {
  doctors: {
    id: 4,
    user_id: 8,
    crm: '123456',
    crm_estado: 'PE',
    telefone: '81999999999',
    especialidade: 'Obstetricia',
  },
  pregnancy_events: {
    id: 5,
    pregnancy_id: 3,
    descricao: 'Consulta de acompanhamento',
    data_evento: '2026-06-11',
  },
  pregnant_documents: {
    id: 6,
    pregnant_id: 2,
    document_name: 'exame.pdf',
    document_type: 'application/pdf',
    extracted_text: 'Hemoglobina 12 g/dL',
    extraction_error: null,
    report_comment: 'Resultado dentro do esperado',
    extraction_status: 'done',
  },
  medidas_fetais: {
    id: 7,
    ccn: 12.3,
    crl: 11.2,
    dgn: 10.1,
    idade_gestacional_semanas: 18,
  },
};

for (const [table, record] of Object.entries(additionalRecords)) {
  assert.deepStrictEqual(
    service.decryptRecord(service.encryptRecord(record, table), table),
    record
  );
}

const versionOneCiphertext = service.encrypt('rotacao');
const versionTwoService = createService(2, {
  AES_ENCRYPTION_KEY_V2: KEY_V2,
});
assert.match(versionTwoService.encrypt('novo'), /^v2:/);
assert.strictEqual(versionTwoService.decrypt(versionOneCiphertext), 'rotacao');

assert.throws(
  () => createCryptoService({
    env: {
      AES_KEY_VERSION: '1',
      AES_ENCRYPTION_KEY_V1: 'short',
    },
  }),
  /64 caracteres hexadecimais/
);
assert.throws(
  () => createCryptoService({ env: { AES_KEY_VERSION: '1' } }),
  /nao configurada/
);
assert.throws(
  () => createCryptoService({
    env: {
      AES_KEY_VERSION: 'invalid',
      AES_ENCRYPTION_KEY_V1: KEY_V1,
    },
  }),
  /inteiro positivo/
);
const legacyKeyService = createCryptoService({
  env: {
    AES_KEY_VERSION: '1',
    AES_ENCRYPTION_KEY: KEY_V1,
  },
});
assert.strictEqual(
  legacyKeyService.decrypt(legacyKeyService.encrypt('legacy-key')),
  'legacy-key'
);
assert.throws(
  () => createService(2, { AES_ENCRYPTION_KEY_V2: KEY_V2 })
    .decrypt('v3:000000000000000000000000:00:00000000000000000000000000000000'),
  /versao 3/
);
assert.throws(
  () => service.encryptRecord({}, 'unknown_table'),
  /sem classificacao/
);

process.env.AES_KEY_VERSION = '1';
process.env.AES_ENCRYPTION_KEY_V1 = KEY_V1;
const defaultCiphertext = cryptoServiceModule.encrypt('default-service');
assert.strictEqual(cryptoServiceModule.decrypt(defaultCiphertext), 'default-service');
const defaultRecord = cryptoServiceModule.encryptRecord(
  { name: 'Ana', role: 'gestante' },
  'users'
);
assert.deepStrictEqual(
  cryptoServiceModule.decryptRecord(defaultRecord, 'users'),
  { name: 'Ana', role: 'gestante' }
);

assert.ok(ENCRYPTED_FIELDS.users.includes('email'));
assert.ok(ENCRYPTED_FIELDS.pregnants.includes('gestacao_atual_hiv_aids'));
assert.ok(ENCRYPTED_FIELDS.pregnant_documents.includes('report_comment'));
assert.ok(getEncryptedFields('medidas_fetais').includes('ccn'));

console.log('OK: cryptoService AES-256-GCM validado.');
