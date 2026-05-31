const assert = require('assert');

const {
  generateEmbedding,
  normalizeEmbeddingInput,
} = require('../services/embeddingService');

async function main() {
  const passageInput = normalizeEmbeddingInput(
    'A pré-eclâmpsia é uma condição hipertensiva da gestação.',
    'passage'
  );

  assert.ok(passageInput.startsWith('passage:'));

  const queryInput = normalizeEmbeddingInput(
    'Quais sinais indicam pré-eclâmpsia?',
    'query'
  );

  assert.ok(queryInput.startsWith('query:'));

  console.log('Gerando embedding de teste...');

  const embedding = await generateEmbedding(
    'A pré-eclâmpsia é uma condição hipertensiva da gestação.',
    'passage'
  );

  assert.strictEqual(embedding.length, 384);
  assert.ok(typeof embedding[0] === 'number');

  console.log('OK: embeddingService validado com sucesso.');
  console.log('Dimensão:', embedding.length);
  console.log('Primeiros 5 valores:', embedding.slice(0, 5));
}

main().catch((error) => {
  console.error('Erro no teste do embeddingService:', error);
  process.exit(1);
});