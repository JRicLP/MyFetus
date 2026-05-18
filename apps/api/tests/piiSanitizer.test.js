const assert = require('assert');
const {
  sanitizeForLog,
  sanitizeForLLM,
  sanitizeRecord,
  sanitizeText
} = require('../utils/piiSanitizer');

const rawPatient = {
  name: 'Maria da Silva Santos',
  email: 'maria.santos@example.com',
  birthdate: '1991-05-17',
  password: 'senha123',
  telefone: '(11) 98765-4321',
  clinical: {
    peso_atual: 78.4,
    pressao_sistole: 120,
    pressao_diastole: 80
  }
};

const rawText = 'Paciente Maria da Silva Santos, CPF 123.456.789-10, email maria.santos@example.com e CRM 123456 SP.';

const logSanitized = sanitizeForLog(rawPatient);
const llmSanitizedText = sanitizeForLLM(rawText);
const recordSanitized = sanitizeRecord(
  {
    name: 'Maria da Silva Santos',
    email: 'maria.santos@example.com',
    birthdate: '1991-05-17',
    password: 'senha123'
  },
  'users',
  'mask'
);

console.log('ANTES (objeto bruto):');
console.log(JSON.stringify(rawPatient, null, 2));

console.log('\nDEPOIS (log sanitizado):');
console.log(JSON.stringify(logSanitized, null, 2));

console.log('\nTEXTO PARA LLM (sanitizado):');
console.log(llmSanitizedText);

console.log('\nREGISTRO MASCARADO (users):');
console.log(JSON.stringify(recordSanitized, null, 2));

assert.notDeepStrictEqual(rawPatient, logSanitized);
assert.strictEqual(logSanitized.name, 'Maria d. S. S.');
assert.strictEqual(logSanitized.email, 'm***s@e***');
assert.strictEqual(logSanitized.password, '[REDACTED]');
assert.strictEqual(logSanitized.telefone, '(**) *****-21');
assert.ok(llmSanitizedText.includes('[CPF]'));
assert.ok(llmSanitizedText.includes('[EMAIL]'));
assert.ok(llmSanitizedText.includes('[CRM]'));
assert.strictEqual(recordSanitized.name, 'Maria d. S. S.');
assert.strictEqual(recordSanitized.email, 'm***s@e***');
assert.ok(recordSanitized.birthdate.includes('**'));

console.log('\nOK: sanitização de logs e LLM validada com sucesso.');