const assert = require('assert');
const express = require('express');
const { getSecurityConfig, requireHttps } = require('../config/security');
const { createAuthLimiters } = require('../middlewares/authRateLimit');

function mockResponse() {
  return {
    headers: {},
    statusCode: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function testHttpsMiddleware() {
  const config = getSecurityConfig({
    NODE_ENV: 'production',
    JWT_SECRET: 'x'.repeat(48),
    TRUST_PROXY: '1',
  });
  assert.strictEqual(config.enforceHttps, true);
  assert.strictEqual(config.trustProxy, 1);

  const insecureResponse = mockResponse();
  requireHttps(config)(
    { secure: false },
    insecureResponse,
    () => assert.fail('HTTP nao deveria prosseguir')
  );
  assert.strictEqual(insecureResponse.statusCode, 426);

  const secureResponse = mockResponse();
  let proceeded = false;
  requireHttps(config)(
    { secure: true },
    secureResponse,
    () => { proceeded = true; }
  );
  assert.strictEqual(proceeded, true);
  assert.ok(secureResponse.headers['Strict-Transport-Security']);
}

async function testRateLimit() {
  const app = express();
  const { loginLimiter } = createAuthLimiters({
    windowMs: 60000,
    loginMax: 2,
  });
  app.post('/login', loginLimiter, (req, res) => {
    res.status(401).json({ error: 'invalid' });
  });

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  try {
    const { port } = server.address();
    const statuses = [];
    for (let index = 0; index < 3; index += 1) {
      const response = await fetch(`http://127.0.0.1:${port}/login`, {
        method: 'POST',
      });
      statuses.push(response.status);
    }
    assert.deepStrictEqual(statuses, [401, 401, 429]);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

async function run() {
  await testHttpsMiddleware();
  await testRateLimit();
  console.log('OK: HTTPS e rate limiting validados.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
