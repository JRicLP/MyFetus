/**
 * Inventario das rotas HTTP da API, usado pelo verificador do contrato OpenAPI.
 *
 * O server.js nao exporta o app (ele conecta no banco e chama listen ao ser
 * carregado). Por isso o inventario le a tabela de montagem do server.js
 * (`const x = require('./routes/...')` + `app.use('/prefixo', x)`) e percorre
 * a pilha de cada router do Express.
 */
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('../middlewares/auth');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

function parseServerMounts(serverSource) {
  const routeModules = new Map();
  const requirePattern = /const\s+(\w+)\s*=\s*require\(\s*['"]\.\/routes\/([\w-]+)['"]\s*\)/g;
  for (const [, variable, file] of serverSource.matchAll(requirePattern)) {
    routeModules.set(variable, file);
  }

  const mounts = [];
  const mountPattern = /app\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/g;
  for (const [, prefix, variable] of serverSource.matchAll(mountPattern)) {
    const file = routeModules.get(variable);
    if (!file) {
      throw new Error(
        `Montagem app.use('${prefix}', ${variable}) nao aponta para um require('./routes/...'). ` +
        'Atualize utils/routeInventory.js para reconhecer esse formato.'
      );
    }
    mounts.push({ prefix, file });
  }

  const directRoutes = [];
  const directPattern = new RegExp(
    `app\\.(${HTTP_METHODS.join('|')})\\(\\s*['"]([^'"]+)['"]([^\\n]*)`,
    'g'
  );
  for (const [, method, routePath, rest] of serverSource.matchAll(directPattern)) {
    directRoutes.push({
      method: method.toUpperCase(),
      path: routePath,
      authenticated: rest.includes('authenticateToken'),
      roles: null,
    });
  }

  return { mounts, directRoutes };
}

// Express usa ":id"; OpenAPI usa "{id}".
function toOpenApiPath(expressPath) {
  return expressPath.replace(/:(\w+)/g, '{$1}');
}

function joinPath(prefix, routePath) {
  if (routePath === '/') return prefix;
  return `${prefix.replace(/\/$/, '')}${routePath}`;
}

function describeGuards(handles) {
  const authenticated = handles.includes(authenticateToken);
  const roleGuard = handles.find((handle) => Array.isArray(handle.allowedRoles));
  return {
    authenticated,
    roles: roleGuard ? [...roleGuard.allowedRoles].sort() : null,
  };
}

function collectRouterRoutes(prefix, router) {
  const routerHandles = router.stack.filter((layer) => !layer.route).map((layer) => layer.handle);

  return router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => {
      const handles = [...routerHandles, ...layer.route.stack.map((s) => s.handle)];
      const guards = describeGuards(handles);
      return Object.keys(layer.route.methods)
        .filter((method) => HTTP_METHODS.includes(method))
        .map((method) => ({
          method: method.toUpperCase(),
          path: toOpenApiPath(joinPath(prefix, layer.route.path)),
          ...guards,
        }));
    });
}

/**
 * Retorna todas as rotas da API: [{ method, path, authenticated, roles }].
 * `loadRouter(file)` permite ao chamador carregar os routers com dependencias
 * substituidas (ex.: banco mockado nos testes).
 */
function collectApiRoutes({
  apiDir = path.join(__dirname, '..'),
  loadRouter = (file) => require(path.join(apiDir, 'routes', file)),
} = {}) {
  const serverSource = fs.readFileSync(path.join(apiDir, 'server.js'), 'utf8');
  const { mounts, directRoutes } = parseServerMounts(serverSource);

  const mounted = mounts.flatMap(({ prefix, file }) => collectRouterRoutes(prefix, loadRouter(file)));
  const direct = directRoutes.map((route) => ({ ...route, path: toOpenApiPath(route.path) }));
  return [...mounted, ...direct];
}

module.exports = {
  collectApiRoutes,
  parseServerMounts,
  toOpenApiPath,
};
