const assert = require('assert');
const { createCryptoService } = require('../services/cryptoService');

const env = {
  AES_KEY_VERSION: '1',
  AES_ENCRYPTION_KEY_V1: '11'.repeat(32),
};
const cryptoService = createCryptoService({ env });

function loadServiceWithCryptoMock() {
  const cryptoPath = require.resolve('../services/cryptoService');
  const servicePath = require.resolve('../services/clinicalDataService');
  const original = require.cache[cryptoPath];

  require.cache[cryptoPath] = {
    id: cryptoPath,
    filename: cryptoPath,
    loaded: true,
    exports: cryptoService,
  };
  delete require.cache[servicePath];
  const service = require('../services/clinicalDataService');

  if (original) require.cache[cryptoPath] = original;
  else delete require.cache[cryptoPath];
  delete require.cache[servicePath];
  return service;
}

function run() {
  const {
    decryptPregnantDetails,
    decryptPregnantSummary,
  } = loadServiceWithCryptoMock();

  const user = cryptoService.encryptRecord(
    { name: 'Maria', birthdate: '1990-05-10' },
    'users'
  );
  const pregnancy = cryptoService.encryptRecord(
    { weeks: 24, glicemia: 91 },
    'pregnancies'
  );
  const summary = decryptPregnantSummary({
    pregnant_id: 7,
    patient_name: user.name,
    birthdate: user.birthdate,
    semanas_gestacao: pregnancy.weeks,
  });
  assert.strictEqual(summary.patient_name, 'Maria');
  assert.strictEqual(summary.semanas_gestacao, 24);

  const pregnant = cryptoService.encryptRecord(
    { id: 7, altura: 1.65, user_id: 2 },
    'pregnants'
  );
  const older = cryptoService.encryptRecord(
    { id: 1, descricao: 'Primeiro', data_evento: '2026-01-01' },
    'pregnancy_events'
  );
  const newer = cryptoService.encryptRecord(
    { id: 2, descricao: 'Segundo', data_evento: '2026-02-01' },
    'pregnancy_events'
  );
  const details = decryptPregnantDetails(
    { ...pregnant, patient_name: user.name, birthdate: user.birthdate },
    pregnancy,
    [older, newer]
  );

  assert.strictEqual(details.altura, 1.65);
  assert.strictEqual(details.latest_pregnancy.glicemia, 91);
  assert.deepStrictEqual(
    details.all_events.map((event) => event.descricao),
    ['Segundo', 'Primeiro']
  );

  const legacy = decryptPregnantSummary({
    patient_name: 'Legada',
    birthdate: '1988-01-01',
    semanas_gestacao: '12',
  });
  assert.strictEqual(legacy.patient_name, 'Legada');
  assert.strictEqual(legacy.semanas_gestacao, '12');

  console.log('clinicalDataService: OK');
}

run();
