const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'consent-middleware-test-secret';

const accepted = new Set();
const db = {
  async query(sql, params = []) {
    if (/FROM consents/.test(sql)) {
      return {
        rows: [...accepted]
          .filter((item) => item.user_id === params[0])
          .map((item) => ({
            purpose: item.purpose,
            version: item.version,
            decision: item.decision,
            created_at: item.created_at,
          })),
      };
    }
    throw new Error(`Consulta inesperada: ${sql}`);
  },
};

const mocks = {
  '../backend': db,
  '../utils/logger': { error() {}, warn() {}, info() {} },
};
const originalLoad = Module._load;
Module._load = function (request) {
  if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
  return originalLoad.apply(this, arguments);
};
const { requireCurrentConsent } = require('../middlewares/consent');
const { authenticateToken } = require('../middlewares/auth');
Module._load = originalLoad;

const tokenFor = (user) => jwt.sign(user, process.env.JWT_SECRET);

test.describe('middleware de consentimento vigente', () => {
  let server;
  let baseUrl;

  test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use(requireCurrentConsent);
    app.get('/api/clinical', authenticateToken, (req, res) => res.json({ ok: true }));
    app.get('/api/consents/me', authenticateToken, (req, res) => res.json({ ok: true }));
    app.post('/api/users', (req, res) => res.status(201).json({ ok: true }));
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  test.after(() => server.close());
  test.beforeEach(() => accepted.clear());

  async function call(path, { method = 'GET', auth } = {}) {
    const headers = {};
    if (auth) headers.Authorization = auth;
    const response = await fetch(`${baseUrl}${path}`, { method, headers });
    return { status: response.status, body: await response.json() };
  }

  test('bloqueia uso clínico quando há finalidade obrigatória pendente', async () => {
    const response = await call('/api/clinical', {
      auth: `Bearer ${tokenFor({ id: 7, role: 'gestante' })}`,
    });

    assert.equal(response.status, 428);
    assert.equal(response.body.code, 'CONSENT_REQUIRED');
    assert.ok(response.body.pending.length > 0);
  });

  test('mantém a regularização disponível mesmo com consentimento pendente', async () => {
    const status = await call('/api/consents/me', {
      auth: `Bearer ${tokenFor({ id: 7, role: 'gestante' })}`,
    });
    const signup = await call('/api/users', { method: 'POST' });

    assert.equal(status.status, 200);
    assert.deepEqual(status.body, { ok: true });
    assert.equal(signup.status, 201);
  });

  test('libera uso clínico quando todas as finalidades obrigatórias estão vigentes', async () => {
    accepted.add({
      user_id: 7,
      purpose: 'termos_de_uso_gestante',
      version: '0.1-rascunho',
      decision: 'accepted',
      created_at: new Date(),
    });
    accepted.add({
      user_id: 7,
      purpose: 'politica_de_privacidade',
      version: '0.1-rascunho',
      decision: 'accepted',
      created_at: new Date(),
    });
    accepted.add({
      user_id: 7,
      purpose: 'tratamento_dados_saude',
      version: '0.1-rascunho',
      decision: 'accepted',
      created_at: new Date(),
    });

    const response = await call('/api/clinical', {
      auth: `Bearer ${tokenFor({ id: 7, role: 'gestante' })}`,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { ok: true });
  });

  test('rejeita token inválido antes de consultar consentimentos', async () => {
    const response = await call('/api/clinical', { auth: 'Bearer token-invalido' });
    assert.equal(response.status, 401);
  });
});
