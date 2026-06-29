const test = require('node:test');
const assert = require('node:assert');
const Module = require('node:module');

const originalRequire = Module.prototype.require;
Module.prototype.require = function(request) {
  if (request.endsWith('../backend') || request.endsWith('backend')) {
    return { query: test.mock.fn(async () => ({ rows: [] })) };
  }
  if (request.endsWith('../utils/logger') || request.endsWith('logger')) {
    return { error: test.mock.fn() };
  }
  return originalRequire.apply(this, arguments);
};

const {
  buildAuditEntry,
  sanitizeDetail,
} = require('../services/auditService');

test.describe('auditService', () => {
  test.it('remove PII dos detalhes antes de persistir', () => {
    const detail = sanitizeDetail({
      email: 'maria@gmail.com',
      cpf: '123.456.789-00',
      nested: { phone: '(81) 99999-8888' },
    });

    assert.deepStrictEqual(detail, {
      email: '[EMAIL]',
      cpf: '[CPF]',
      nested: { phone: '[TELEFONE]' },
    });
  });

  test.it('monta entrada de auditoria com ator, IP e user-agent', () => {
    const entry = buildAuditEntry({
      user: { id: 7, role: 'medico' },
      headers: {
        'x-forwarded-for': '203.0.113.10, 10.0.0.1',
        'user-agent': 'Expo Test Client',
      },
    }, {
      action: 'DOCUMENT_UPLOADED',
      resource: 'pregnant_documents',
      resource_id: 12,
      outcome: 'SUCCESS',
      detail: { document_name: 'exame maria@gmail.com.pdf' },
    });

    assert.strictEqual(entry.actor_id, 7);
    assert.strictEqual(entry.actor_role, 'medico');
    assert.strictEqual(entry.ip_address, '203.0.113.10');
    assert.strictEqual(entry.resource_id, '12');
    assert.strictEqual(entry.detail.document_name, 'exame [EMAIL]');
  });
});
