// como testar:
// cd apps/api
// docker compose run --rm backend node /app/tests/logger.test.js
// docker compose run --rm backend node /app/tests/piiSanitizer.test.js

const assert = require('assert');
const logger = require('../utils/logger');
const { sanitizeForLog } = require('../utils/piiSanitizer');

const originalLog = console.log;
const originalError = console.error;
const captured = [];

console.log = (...args) => {
  captured.push(['log', args.join(' ')]);
};

console.error = (...args) => {
  captured.push(['error', args.join(' ')]);
};

try {
  const rawPayload = {
    method: 'POST',
    path: '/api/users',
    body: {
      name: 'Maria da Silva Santos',
      email: 'maria.santos@example.com',
      password: 'senha123',
      birthdate: '1991-05-17'
    }
  };

  logger.info('[request]', rawPayload);
  logger.error('Erro ao salvar medição', {
    details: 'duplicate key value violates unique constraint',
    payload: rawPayload
  });

  const sanitizedPayload = sanitizeForLog(rawPayload);

  console.log('ANTES');
  console.log(JSON.stringify(rawPayload, null, 2));
  console.log('DEPOIS');
  console.log(JSON.stringify(sanitizedPayload, null, 2));

  const logLine = captured.find(([level, line]) => level === 'log' && line.includes('[request]'))?.[1] || '';
  const errorLine = captured.find(([level]) => level === 'error')?.[1] || '';

  // Verifica que as linhas emitidas são JSON estruturado válido (NDJSON)
  const parsedLog = JSON.parse(logLine);
  assert.strictEqual(parsedLog.level, 'info');
  assert.strictEqual(parsedLog.severity, 'INFO');
  assert.strictEqual(parsedLog.message, '[request]');
  assert.ok(parsedLog.timestamp);
  assert.strictEqual(parsedLog.body.name, 'Maria d. S. S.');
  assert.strictEqual(parsedLog.body.password, '[REDACTED]');

  const parsedError = JSON.parse(errorLine);
  assert.strictEqual(parsedError.level, 'error');
  assert.strictEqual(parsedError.severity, 'ERROR');
  assert.strictEqual(parsedError.message, 'Erro ao salvar medição');
  assert.ok(parsedError.timestamp);
  assert.strictEqual(parsedError.details, 'duplicate key value violates unique constraint');
  assert.strictEqual(parsedError.payload.body.name, 'Maria d. S. S.');

  assert.ok(sanitizedPayload.body.name.includes('Maria d. S. S.'));

  originalLog('ANTES');
  originalLog(JSON.stringify(rawPayload, null, 2));
  originalLog('DEPOIS');
  originalLog(JSON.stringify(sanitizedPayload, null, 2));
  originalLog('OK: logger único sanitiza payloads e emite JSON estruturado.');
} finally {
  console.log = originalLog;
  console.error = originalError;
}
