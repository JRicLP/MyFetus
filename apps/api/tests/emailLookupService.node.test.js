const assert = require('assert');
const {
  createEmailLookupService,
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
assert.throws(() => createEmailLookupService({ key: 'ab' }), /32 bytes/);
console.log('emailLookupService: OK');
