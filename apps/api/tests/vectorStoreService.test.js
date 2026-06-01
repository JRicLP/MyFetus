require('dotenv').config();

const assert = require('assert');

const {
  upsertVectors,
  queryVectors,
  describeIndexStats,
} = require('../services/vectorStoreService');

function createFakeVector(size = 384) {
  // Vetor simples só para validar comunicação com o Pinecone.
  return Array.from({ length: size }, (_, index) => {
    if (index === 0) return 1;
    return 0;
  });
}

async function main() {
  const testNamespace = 'guidelines-test';
  const vector = createFakeVector();

  const record = {
    id: `test-vector-${Date.now()}`,
    values: vector,
    metadata: {
      text: 'Vetor de teste para validar conexão com Pinecone.',
      source: 'Teste local',
      documentId: 'test-document',
      page: 1,
      section: 'Teste',
      documentType: 'test',
      chunkIndex: 0,
      totalChunks: 1,
      indexedAt: new Date().toISOString(),
    },
  };

  console.log('Verificando estatísticas do index...');
  const stats = await describeIndexStats();
  assert.ok(stats);

  console.log('Enviando vetor de teste para o Pinecone...');
  const upsertResult = await upsertVectors([record], testNamespace);

  assert.strictEqual(upsertResult.upsertedCount, 1);
  assert.strictEqual(upsertResult.namespace, testNamespace);

  console.log('Consultando vetor de teste...');
  const queryResult = await queryVectors(vector, {
    namespace: testNamespace,
    topK: 1,
    includeMetadata: true,
  });

  assert.ok(queryResult.matches);
  assert.ok(queryResult.matches.length >= 1);
  assert.ok(queryResult.matches[0].metadata);

  console.log('OK: vectorStoreService validado com sucesso.');
  console.log('Index:', process.env.PINECONE_INDEX_NAME);
  console.log('Namespace de teste:', testNamespace);
  console.log('Resultado encontrado:', queryResult.matches[0]);
}

main().catch((error) => {
  console.error('Erro no teste do vectorStoreService:', error);
  process.exit(1);
});