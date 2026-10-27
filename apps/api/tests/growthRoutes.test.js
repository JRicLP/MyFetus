const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

const growthRoutes = require('../routes/growth');

// Biometria aproximada P50 para 24 semanas (mesma usada em hadlockCalculator.test.js).
const VALID_PERCENTILE_BODY = {
  gestationalAgeWeeks: 24,
  biometrics: { dbp: 60, cc: 220, ca: 200, cf: 43 },
};

// Todas as rotas expostas pelo router /api/growth.
const ROUTES = [
  { method: 'GET', path: '/chart' },
  { method: 'POST', path: '/percentile', body: VALID_PERCENTILE_BODY },
];

function tokenFor(user, secret = process.env.JWT_SECRET) {
  return `Bearer ${jwt.sign(user, secret)}`;
}

test.describe('/api/growth/* - autenticacao JWT', () => {
  let server;
  let baseUrl;

  test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/growth', growthRoutes);
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/api/growth`;
  });

  test.after(() => server.close());

  function request({ method, path, body }, authorization) {
    const headers = { 'Content-Type': 'application/json' };
    if (authorization) headers.Authorization = authorization;
    return fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  const invalidCredentials = [
    ['sem token', undefined],
    ['com token malformado', 'Bearer token-falso'],
    ['com esquema diferente de Bearer', `Basic ${Buffer.from('user:pass').toString('base64')}`],
    ['com token assinado por outro segredo', tokenFor({ id: 5, role: 'gestante' }, 'segredo-de-atacante')],
    [
      'com token expirado',
      tokenFor({ id: 5, role: 'gestante', exp: Math.floor(Date.now() / 1000) - 60 }),
    ],
  ];

  for (const route of ROUTES) {
    for (const [description, authorization] of invalidCredentials) {
      test(`${route.method} ${route.path} retorna 401 ${description}`, async () => {
        const res = await request(route, authorization);
        assert.strictEqual(res.status, 401);
      });
    }
  }

  for (const role of ['gestante', 'medico', 'admin']) {
    test(`GET /chart retorna a curva de Hadlock para ${role} autenticado`, async () => {
      const res = await request(ROUTES[0], tokenFor({ id: 5, role }));
      assert.strictEqual(res.status, 200);
      const chart = await res.json();
      assert.ok(Array.isArray(chart) && chart.length > 0);
      assert.deepStrictEqual(Object.keys(chart[0]), ['semana', 'p10', 'p50', 'p90']);
    });

    test(`POST /percentile calcula o percentil para ${role} autenticado`, async () => {
      const res = await request(ROUTES[1], tokenFor({ id: 5, role }));
      assert.strictEqual(res.status, 200);
      const result = await res.json();
      assert.strictEqual(typeof result.percentile, 'number');
      assert.ok(result.percentile >= 0 && result.percentile <= 100);
    });
  }

  test('POST /percentile mantem a validacao de negocio (400) apos autenticar', async () => {
    const res = await request(
      { method: 'POST', path: '/percentile', body: { gestationalAgeWeeks: 24, biometrics: {} } },
      tokenFor({ id: 5, role: 'gestante' })
    );
    assert.strictEqual(res.status, 400);
  });
});
