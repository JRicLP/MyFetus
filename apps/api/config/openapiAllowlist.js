/**
 * Rotas do Express que ficam fora do contrato OpenAPI (apps/api/openapi.yaml).
 *
 * Toda entrada precisa de justificativa e e revisada em PR. O verificador
 * (tests/openapiContract.test.js) falha se uma entrada nao corresponder a
 * nenhuma rota existente.
 */
module.exports = Object.freeze([
  {
    prefix: '/docs',
    reason: 'Documentacao da propria API (Swagger UI e especificacao bruta); nao faz parte do contrato de negocio.',
  },
]);
