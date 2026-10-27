const assert = require('assert');
const {
  createEmailLookupService,
  normalizeCrm,
  normalizeCrmState,
  normalizeEmail,
} = require('../services/emailLookupService');

const service = createEmailLookupService({ key: 'ab'.repeat(32) });
assert.strictEqual(
  service.hash(' User@Example.COM '),
  service.hash('user@example.com')
);
assert.match(service.hash('user@example.com'), /^[0-9a-f]{64}$/);
assert.notStrictEqual(
  service.hash('one@example.com'),
  service.hash('two@example.com')
);
assert.strictEqual(normalizeEmail(' A@B.COM '), 'a@b.com');
assert.strictEqual(normalizeCrm(' 123-456 '), '123456');
assert.strictEqual(normalizeCrmState(' pe '), 'PE');
assert.strictEqual(
  service.hashCrm('123-456', 'pe'),
  service.hashCrm('123456', 'PE')
);
assert.notStrictEqual(service.hashCrm('123456', 'PE'), service.hashCrm('123456', 'SP'));
assert.throws(() => createEmailLookupService({ key: 'ab' }), /32 bytes/);
console.log('emailLookupService: OK');
