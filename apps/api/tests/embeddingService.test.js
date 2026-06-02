const assert = require('assert');
const {
  createTextChunks,
  generateChunkedEmbeddings,
} = require('../services/embeddingService');

function fakeEmbedding(seed) {
  return [seed, seed + 0.1, seed + 0.2];
}

async function embedTexts(texts) {
  embedTexts.calls.push(texts);
  return texts.map((_, index) => fakeEmbedding(index));
}
embedTexts.calls = [];

async function run() {
  const shortResult = await generateChunkedEmbeddings(
    'glicemia normal sem sinais de alteracao',
    {
      chunkSize: 500,
      overlap: 50,
      embedTexts,
    }
  );

  assert.strictEqual(shortResult.length, 1);
  assert.strictEqual(shortResult[0].chunk_index, 0);
  assert.strictEqual(shortResult[0].chunk_total, 1);
  assert.deepStrictEqual(shortResult[0].embedding, fakeEmbedding(0));

  const longText = Array.from({ length: 1100 }, (_, index) => `token${index}`).join(' ');
  const longChunks = createTextChunks(longText, { chunkSize: 500, overlap: 50 });

  assert.ok(longChunks.length > 1);
  const firstTokens = longChunks[0].split(/\s+/);
  const secondTokens = longChunks[1].split(/\s+/);
  assert.deepStrictEqual(secondTokens.slice(0, 50), firstTokens.slice(-50));

  embedTexts.calls = [];
  const piiText = 'Paciente com CPF 123.456.789-10 e email maria@example.com realizou ultrassom.';
  const piiResult = await generateChunkedEmbeddings(piiText, {
    chunkSize: 500,
    overlap: 50,
    embedTexts,
  });

  assert.strictEqual(piiResult.length, 1);
  assert.ok(embedTexts.calls[0][0].includes('[CPF]'));
  assert.ok(embedTexts.calls[0][0].includes('[EMAIL]'));
  assert.ok(!embedTexts.calls[0][0].includes('123.456.789-10'));
  assert.ok(!embedTexts.calls[0][0].includes('maria@example.com'));

  assert.deepStrictEqual(await generateChunkedEmbeddings('', { embedTexts }), []);
  assert.deepStrictEqual(await generateChunkedEmbeddings(null, { embedTexts }), []);

  console.log('OK: embeddingService valida chunking, sanitizacao e formato de saida.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
