// como executar o teste:
// cd /home/agil/dev/MyFetus && docker compose run --rm backend node /app/tests/internalLoinc.test.js

const assert = require('assert');
const { mapSingleTerm, mapTextBlock } = require('../controllers/internalLoincController');

const createMockResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };

  return response;
};

async function run() {
  const termResponse = createMockResponse();
  await mapSingleTerm(
    { body: { term: 'Hemoglobina' } },
    termResponse
  );

  assert.strictEqual(termResponse.statusCode, 200);
  assert.strictEqual(termResponse.payload.source, 'dba-loinc-v1');
  assert.strictEqual(termResponse.payload.input, 'Hemoglobina');
  assert.strictEqual(termResponse.payload.result.status, 'mapped');
  assert.strictEqual(termResponse.payload.result.loinc, '718-7');

  const textResponse = createMockResponse();
  await mapTextBlock(
    {
      body: {
        text: 'Hemoglobina\nHematócrito\nTermo sem correspondencia',
      },
    },
    textResponse
  );

  assert.strictEqual(textResponse.statusCode, 200);
  assert.strictEqual(textResponse.payload.result.summary.total, 3);
  assert.strictEqual(textResponse.payload.result.summary.mapped, 2);
  assert.strictEqual(textResponse.payload.result.summary.unmapped, 1);

  console.log('OK: endpoint interno LOINC respondeu com mapeamento esperado.');
  console.log(JSON.stringify({
    term: termResponse.payload,
    text: textResponse.payload,
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});