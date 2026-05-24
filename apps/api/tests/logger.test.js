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

  assert.ok(logLine.includes('Maria d. S. S.'));
  assert.ok(logLine.includes('m***s@e***'));
  assert.ok(logLine.includes('[REDACTED]'));
  assert.ok(errorLine.includes('Erro ao salvar medição'));
  assert.ok(errorLine.includes('duplicate key value violates unique constraint'));
  assert.ok(errorLine.includes('Maria d. S. S.'));
  assert.ok(sanitizedPayload.body.name.includes('Maria d. S. S.'));

  originalLog('ANTES');
  originalLog(JSON.stringify(rawPayload, null, 2));
  originalLog('DEPOIS');
  originalLog(JSON.stringify(sanitizedPayload, null, 2));
  originalLog('OK: logger único sanitiza payloads antes de registrar.');
} finally {
  console.log = originalLog;
  console.error = originalError;
}
