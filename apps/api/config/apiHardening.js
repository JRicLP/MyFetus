const helmet = require('helmet');

const BODY_LIMIT = '100kb';

const DEV_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19006',
  'http://127.0.0.1:3000',
];

const SAFE_MESSAGES = {
  400: 'invalid_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  413: 'payload_too_large',
  429: 'too_many_requests',
};

function getAllowedOrigins(env = process.env) {
  const configured = (env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.includes('*')) {
    throw new Error("CORS_ORIGIN não pode conter '*': liste as origens explicitamente.");
  }
  if (configured.length > 0) return configured;
  if (env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN é obrigatório em produção (origens separadas por vírgula).');
  }
  return DEV_ORIGINS;
}

function createCorsOptions(allowedOrigins) {
  return {
    origin(origin, callback) {
      // Apps nativos (Expo/React Native), curl e health checks não enviam Origin.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(Object.assign(new Error('origin_not_allowed'), { code: 'CORS_BLOCKED' }));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 600,
  };
}

function createSecurityHeaders() {
  // HSTS fica em config/security.js (requireHttps), por isso hsts: false aqui.
  const apiHeaders = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: null,
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: false,
  });

  // Swagger UI precisa de scripts/estilos inline.
  const docsHeaders = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        upgradeInsecureRequests: null,
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: false,
  });

  return (req, res, next) => {
    if (req.path.startsWith('/api')) res.set('Cache-Control', 'no-store');
    return (req.path.startsWith('/docs') ? docsHeaders : apiHeaders)(req, res, next);
  };
}

function resolveStatus(err) {
  if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') return 413;
  if (err.type === 'entity.parse.failed' || err.name === 'MulterError') return 400;
  if (err.code === 'CORS_BLOCKED') return 403;
  if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500) return err.status;
  return 500;
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: SAFE_MESSAGES[404] });
}

function createErrorHandler(logger) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = resolveStatus(err);
    // Só metadados: nunca err.message, stack, body ou query (podem conter PII).
    logger.error('request_failed', { status, code: err.code, method: req.method, path: req.path });
    res.status(status).json({
      error: SAFE_MESSAGES[status] || (status >= 500 ? 'internal_error' : 'request_error'),
    });
  };
}

// Aplica o limiter global em /api e o limiter extra do RAG em /api/internal/rag.
// Montado sem caminho no app.use para não confundir utils/routeInventory.js,
// que só reconhece app.use('/caminho', require('./routes/...')).
function createRateLimitMiddleware({ apiLimiter, ragLimiter }) {
  return (req, res, next) => {
    if (!req.path.startsWith('/api')) return next();
    if (!req.path.startsWith('/api/internal/rag')) return apiLimiter(req, res, next);
    return apiLimiter(req, res, (err) => (err ? next(err) : ragLimiter(req, res, next)));
  };
}

module.exports = {
  BODY_LIMIT,
  getAllowedOrigins,
  createCorsOptions,
  createSecurityHeaders,
  notFoundHandler,
  createErrorHandler,
    createRateLimitMiddleware,
};