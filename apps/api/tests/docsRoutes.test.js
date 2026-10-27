const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const express = require('express');
const YAML = require('yaml');

// /docs nao pode depender do banco: qualquer require do backend derruba o teste.
const originalLoad = Module._load;
Module._load = function (request) {
  if (/(^|\/)backend$/.test(request)) {
    throw new Error('/docs nao deve carregar o modulo do banco');
  }
  return originalLoad.apply(this, arguments);
};
const docsRoutes = require('../routes/docs');
Module._load = originalLoad;

const SPEC_FILE = path.join(__dirname, '..', 'openapi.yaml');

test.describe('GET /docs - smoke test da documentacao', () => {
  let server;
  let baseUrl;

  test.before(async () => {
    const app = express();
    app.use('/docs', docsRoutes);
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/docs`;
  });

  test.after(() => server.close());

  test('/docs redireciona para /docs/ e serve a Swagger UI sem autenticacao', async () => {
    const redirect = await fetch(baseUrl, { redirect: 'manual' });
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get('location'), '/docs/');

    const page = await fetch(`${baseUrl}/`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.match(await page.text(), /swagger-ui/);
  });

  test('"Try it out" fica desabilitado', async () => {
    const init = await fetch(`${baseUrl}/swagger-ui-init.js`);
    assert.equal(init.status, 200);
    assert.match(await init.text(), /"supportedSubmitMethods":\s*\[\]/);
  });

  test('/docs/openapi.json devolve a especificacao versionada, de forma deterministica', async () => {
    const first = await fetch(`${baseUrl}/openapi.json`);
    const second = await fetch(`${baseUrl}/openapi.json`);
    assert.equal(first.status, 200);
    assert.match(first.headers.get('content-type'), /application\/json/);

    const firstBody = await first.text();
    assert.equal(firstBody, await second.text());

    const expected = YAML.parse(fs.readFileSync(SPEC_FILE, 'utf8'));
    assert.deepEqual(JSON.parse(firstBody), expected);
    assert.match(expected.openapi, /^3\.1\./);
  });

  test('/docs/openapi.yaml devolve o arquivo bruto', async () => {
    const res = await fetch(`${baseUrl}/openapi.yaml`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/yaml/);
    assert.equal(await res.text(), fs.readFileSync(SPEC_FILE, 'utf8'));
  });

  test('aplica rate limit nas rotas de documentacao', async () => {
    const res = await fetch(`${baseUrl}/openapi.json`);
    assert.ok(res.headers.get('ratelimit-policy'));
  });

  test('caminho inexistente sob /docs retorna 404', async () => {
    const res = await fetch(`${baseUrl}/nao-existe`);
    assert.equal(res.status, 404);
  });
});
