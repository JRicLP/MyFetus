const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const cors = require('cors');

// Stub do audit antes de carregar o rate limit (evita dependência de banco).
const auditPath = require.resolve('../services/auditService');
require.cache[auditPath] = { id: auditPath, filename: auditPath, loaded: true, exports: { audit() {} } };

const { createAuthLimiters } = require('../middlewares/authRateLimit');
const hardening = require('../config/apiHardening');

const ALLOWED = 'http://localhost:8081';
const EMAIL = 'maria@example.com';

function buildApp(limiterOptions = {}) {
  const app = express();
  const logs = [];
  const logger = { error: (...args) => logs.push(args) };
  const limiters = createAuthLimiters(limiterOptions);

  app.disable('x-powered-by');
  app.use(hardening.createSecurityHeaders());
  app.use(cors(hardening.createCorsOptions([ALLOWED])));
  app.use(hardening.createRateLimitMiddleware(limiters));
  app.use(express.json({ limit: hardening.BODY_LIMIT }));

  app.get('/ping', (req, res) => res.json({ ok: true }));
  app.get('/docs/index', (req, res) => res.send('docs'));
  app.post('/api/echo', (req, res) => res.json({ ok: true }));
  app.get('/api/boom', () => {
    throw new Error(`duplicate key value violates unique constraint (email)=(${EMAIL})`);
  });

  app.use(hardening.notFoundHandler);
  app.use(hardening.createErrorHandler(logger));
  return { app, logs };
}

function start(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function request(server, { method = 'GET', path = '/', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: server.address().port, method, path, headers },
      (res) => {
        let text = '';
        res.on('data', (chunk) => { text += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

test('Helmet: headers de segurança presentes e x-powered-by ausente', async (t) => {
  const server = await start(buildApp().app);
  t.after(() => server.close());
  const res = await request(server, { path: '/ping' });
  assert.equal(res.status, 200);
  assert.equal(res.headers['x-powered-by'], undefined);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['referrer-policy'], 'no-referrer');
  assert.match(res.headers['content-security-policy'], /default-src 'none'/);
});

test('Helmet: /docs recebe CSP compatível com Swagger UI', async (t) => {
  const server = await start(buildApp().app);
  t.after(() => server.close());
  const res = await request(server, { path: '/docs/index' });
  assert.equal(res.status, 200);
  assert.match(res.headers['content-security-policy'], /script-src[^;]*'unsafe-inline'/);
});

test('/api responde com Cache-Control: no-store', async (t) => {
  const server = await start(buildApp().app);
  t.after(() => server.close());
  const res = await request(server, {
    method: 'POST', path: '/api/echo', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('CORS: origem permitida é refletida; sem Origin (mobile) passa', async (t) => {
  const server = await start(buildApp().app);
  t.after(() => server.close());
  const allowed = await request(server, { path: '/ping', headers: { Origin: ALLOWED } });
  assert.equal(allowed.headers['access-control-allow-origin'], ALLOWED);
  const native = await request(server, { path: '/ping' });
  assert.equal(native.status, 200);
});

test('CORS: origem não listada recebe 403 genérico e sem allow-origin', async (t) => {
  const server = await start(buildApp().app);
  t.after(() => server.close());
  const res = await request(server, { path: '/ping', headers: { Origin: 'http://evil.example' } });
  assert.equal(res.status, 403);
  assert.equal(res.headers['access-control-allow-origin'], undefined);
  assert.deepEqual(JSON.parse(res.text), { error: 'forbidden' });
});

test('CORS: config exige origens explícitas em produção e rejeita *', () => {
  assert.throws(() => hardening.getAllowedOrigins({ NODE_ENV: 'production' }), /CORS_ORIGIN/);
  assert.throws(() => hardening.getAllowedOrigins({ CORS_ORIGIN: '*' }), /explicitamente/);
  assert.deepEqual(
    hardening.getAllowedOrigins({ NODE_ENV: 'production', CORS_ORIGIN: 'https://a.com, https://b.com' }),
    ['https://a.com', 'https://b.com']
  );
  assert.ok(hardening.getAllowedOrigins({ NODE_ENV: 'development' }).includes('http://localhost:8081'));
});

test('Payload acima do limite retorna 413 genérico', async (t) => {
  const server = await start(buildApp().app);
  t.after(() => server.close());
  const body = JSON.stringify({ data: 'x'.repeat(150 * 1024) });
  const res = await request(server, {
    method: 'POST',
    path: '/api/echo',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    body,
  });
  assert.equal(res.status, 413);
  assert.deepEqual(JSON.parse(res.text), { error: 'payload_too_large' });
});

test('JSON malformado retorna 400 sem ecoar o conteúdo enviado', async (t) => {
  const server = await start(buildApp().app);
  t.after(() => server.close());
  const res = await request(server, {
    method: 'POST', path: '/api/echo', headers: { 'Content-Type': 'application/json' },
    body: `{"email":"${EMAIL}",`,
  });
  assert.equal(res.status, 400);
  assert.deepEqual(JSON.parse(res.text), { error: 'invalid_request' });
  assert.ok(!res.text.includes(EMAIL));
});

test('Erro interno não vaza PII, mensagem nem stack (resposta e log)', async (t) => {
  const { app, logs } = buildApp();
  const server = await start(app);
  t.after(() => server.close());
  const res = await request(server, { path: '/api/boom' });
  assert.equal(res.status, 500);
  assert.deepEqual(JSON.parse(res.text), { error: 'internal_error' });
  assert.ok(!res.text.includes(EMAIL));
  assert.ok(!/stack|\bat\s/.test(res.text));
  assert.ok(!JSON.stringify(logs).includes(EMAIL));
});

test('Rota inexistente retorna 404 padronizado', async (t) => {
  const server = await start(buildApp().app);
  t.after(() => server.close());
  const res = await request(server, { path: '/nao-existe' });
  assert.equal(res.status, 404);
  assert.deepEqual(JSON.parse(res.text), { error: 'not_found' });
});

test('Rate limit: excesso retorna 429 seguro, sem IP/e-mail', async (t) => {
  const server = await start(buildApp({ apiMax: 3 }).app);
  t.after(() => server.close());
  const statuses = [];
  let last;
  for (let i = 0; i < 5; i += 1) {
    last = await request(server, {
      method: 'POST', path: '/api/echo', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    statuses.push(last.status);
  }
  assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
  const body = JSON.parse(last.text);
  assert.equal(body.error, 'Muitas tentativas. Tente novamente mais tarde.');
  assert.ok(!last.text.includes('127.0.0.1'));
  assert.ok(last.headers['ratelimit'] || last.headers['retry-after']);
});