/**
 * Documentacao da API (E1-09).
 *
 * Endpoints:
 *   - GET /docs              : Swagger UI (somente leitura, "Try it out" desabilitado).
 *   - GET /docs/openapi.json : especificacao OpenAPI em JSON.
 *   - GET /docs/openapi.yaml : especificacao OpenAPI versionada (arquivo bruto).
 *
 * Observacoes:
 *   - O contrato e lido de apps/api/openapi.yaml uma unica vez, no boot.
 *     Nenhuma rota daqui acessa o banco ou dados clinicos.
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

// Nao importa middlewares/authRateLimit: ele carrega auditService -> backend (banco),
// e o /docs deve funcionar sem nenhuma dependencia do banco.
function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const SPEC_PATH = path.join(__dirname, '..', 'openapi.yaml');
const specYaml = fs.readFileSync(SPEC_PATH, 'utf8');
const spec = YAML.parse(specYaml);

const swaggerUiOptions = {
  customSiteTitle: 'MyFetus API - Documentacao',
  swaggerOptions: {
    // "Try it out" desabilitado: a pagina so exibe o contrato.
    supportedSubmitMethods: [],
  },
};

const router = express.Router();

router.use(
  rateLimit({
    windowMs: positiveInteger(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    limit: positiveInteger(process.env.DOCS_RATE_LIMIT_MAX, 300),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
  })
);

router.get('/openapi.json', (req, res) => {
  res.json(spec);
});

router.get('/openapi.yaml', (req, res) => {
  res.type('application/yaml').send(specYaml);
});

// Assets estaticos da Swagger UI + pagina apenas em GET /docs/ (outros caminhos caem no 404).
router.use(swaggerUi.serveFiles(spec, swaggerUiOptions));
router.get('/', swaggerUi.setup(spec, swaggerUiOptions));

module.exports = router;
