const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const YAML = require('yaml');
const SwaggerParser = require('@apidevtools/swagger-parser');

process.env.JWT_SECRET = 'openapi-contract-test-secret';

// Os routers sao carregados sem banco e sem servicos externos: o verificador so
// le a pilha de middlewares do Express, nunca executa handlers.
const STUBBED_PACKAGES = /^(@huggingface\/transformers|@pinecone-database\/pinecone|@google\/genai|tesseract\.js|pdfjs-dist|@napi-rs\/canvas)/;
const originalLoad = Module._load;
Module._load = function (request) {
  if (/(^|\/)backend$/.test(request)) {
    return { query: async () => ({ rows: [] }), connect: async () => ({ query: async () => ({ rows: [] }), release() {} }) };
  }
  if (STUBBED_PACKAGES.test(request)) {
    return new Proxy(function stub() {}, { get: () => function stub() { return {}; } });
  }
  return originalLoad.apply(this, arguments);
};

const { collectApiRoutes, parseServerMounts } = require('../utils/routeInventory');
const allowlist = require('../config/openapiAllowlist');

const SPEC_FILE = path.join(__dirname, '..', 'openapi.yaml');
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const spec = YAML.parse(fs.readFileSync(SPEC_FILE, 'utf8'));
const routes = collectApiRoutes();
Module._load = originalLoad;

const key = (method, routePath) => `${method.toUpperCase()} ${routePath}`;
const isAllowlisted = (route) => allowlist.some(({ prefix }) =>
  route.path === prefix || route.path.startsWith(`${prefix}/`));

const documentedOperations = new Map(
  Object.entries(spec.paths).flatMap(([routePath, item]) =>
    HTTP_METHODS.filter((method) => item[method]).map((method) => [key(method, routePath), item[method]]))
);
const contractRoutes = routes.filter((route) => !isAllowlisted(route));

test.describe('Contrato OpenAPI (apps/api/openapi.yaml)', () => {
  test('a especificacao e um OpenAPI 3.1 valido, com referencias resolvidas', async () => {
    assert.match(spec.openapi, /^3\.1\./);
    await SwaggerParser.validate(structuredClone(spec));
  });

  test('o inventario encontrou as rotas montadas no server.js', () => {
    assert.ok(contractRoutes.length > 0);
    assert.ok(contractRoutes.some((route) => key(route.method, route.path) === 'GET /ping'));
  });

  test('toda rota do Express esta documentada ou na allowlist', () => {
    const missing = contractRoutes
      .map((route) => key(route.method, route.path))
      .filter((routeKey) => !documentedOperations.has(routeKey));

    assert.deepEqual(
      missing,
      [],
      `Rotas sem documentacao: ${missing.join(', ')}. ` +
        'Documente em apps/api/openapi.yaml ou justifique em config/openapiAllowlist.js.'
    );
  });

  test('todo path documentado corresponde a uma rota existente', () => {
    const existing = new Set(contractRoutes.map((route) => key(route.method, route.path)));
    const stale = [...documentedOperations.keys()].filter((routeKey) => !existing.has(routeKey));

    assert.deepEqual(stale, [], `Operacoes documentadas sem rota no Express: ${stale.join(', ')}`);
  });

  test('autenticacao documentada bate com o authenticateToken da rota', () => {
    const mismatches = contractRoutes.flatMap((route) => {
      const operation = documentedOperations.get(key(route.method, route.path));
      if (!operation) return [];
      if (!Array.isArray(operation.security)) {
        return [`${key(route.method, route.path)}: declare "security" explicitamente`];
      }
      const documentedAuth = operation.security.length > 0;
      return documentedAuth === route.authenticated
        ? []
        : [`${key(route.method, route.path)}: codigo ${route.authenticated ? 'exige' : 'nao exige'} JWT`];
    });

    assert.deepEqual(mismatches, []);
  });

  test('papeis documentados (x-roles) batem com o requireRole da rota', () => {
    const mismatches = contractRoutes.flatMap((route) => {
      const operation = documentedOperations.get(key(route.method, route.path));
      if (!operation) return [];
      const documented = operation['x-roles'] ? [...operation['x-roles']].sort() : null;
      return JSON.stringify(documented) === JSON.stringify(route.roles)
        ? []
        : [`${key(route.method, route.path)}: codigo=${JSON.stringify(route.roles)} doc=${JSON.stringify(documented)}`];
    });

    assert.deepEqual(mismatches, []);
  });

  test('toda entrada da allowlist tem justificativa e corresponde a uma rota', () => {
    for (const entry of allowlist) {
      assert.ok(entry.reason && entry.reason.trim().length >= 10, `Justificativa ausente para ${entry.prefix}`);
      const matches = routes.some((route) =>
        route.path === entry.prefix || route.path.startsWith(`${entry.prefix}/`));
      assert.ok(matches, `Allowlist sem rota correspondente: ${entry.prefix}`);
    }
  });

  test('operacoes autenticadas documentam 401 e operacoes com papel documentam 403', () => {
    const missing = [...documentedOperations.entries()].flatMap(([routeKey, operation]) => {
      const problems = [];
      if (operation.security?.length && !operation.responses['401']) problems.push(`${routeKey}: falta 401`);
      if (operation['x-roles'] && !operation.responses['403']) problems.push(`${routeKey}: falta 403`);
      return problems;
    });

    assert.deepEqual(missing, []);
  });
});

test.describe('Inventario de rotas (utils/routeInventory.js)', () => {
  test('le requires e montagens do server.js e converte :param para {param}', () => {
    const { mounts, directRoutes } = parseServerMounts(`
      const userRoutes = require('./routes/users');
      app.use(express.json());
      app.use('/api/users', userRoutes);
      app.get('/ping', (req, res) => res.json({}));
    `);
    assert.deepEqual(mounts, [{ prefix: '/api/users', file: 'users' }]);
    assert.deepEqual(directRoutes, [{ method: 'GET', path: '/ping', authenticated: false, roles: null }]);
  });

  test('falha alto quando uma montagem nao aponta para um require de ./routes', () => {
    assert.throws(
      () => parseServerMounts(`app.use('/api/novo', algumRouter);`),
      /nao aponta para um require/
    );
  });

  test('detecta rota nova nao documentada (cenario que deve quebrar a CI)', () => {
    const fakeRoute = { method: 'POST', path: '/api/rota-nova', authenticated: true, roles: null };
    assert.equal(documentedOperations.has(key(fakeRoute.method, fakeRoute.path)), false);
    assert.equal(isAllowlisted(fakeRoute), false);
  });
});
