/**
 * ragSearch.test.js
 *
 * Testa se uma pergunta consegue recuperar trechos indexados no Pinecone.
 */

require('dotenv').config();

const assert = require('assert');

const { generateEmbedding } = require('../services/embeddingService');
const { queryVectors } = require('../services/vectorStoreService');

async function main() {
  const question = 'Quais são fatores de risco para pré-eclâmpsia?';
  const question = 'Como é feita a estratificação de risco na gestação?';

  console.log('Pergunta:', question);
  console.log('Gerando embedding da pergunta...');

  // Perguntas usam o prefixo query no modelo E5.
  const queryEmbedding = await generateEmbedding(question, 'query');

  console.log('Buscando trechos relevantes no Pinecone...');

  const result = await queryVectors(queryEmbedding, {
    namespace: process.env.PINECONE_NAMESPACE || 'guidelines',
    topK: 5,
    includeMetadata: true,
  });

  assert.ok(result.matches);
  assert.ok(result.matches.length > 0);

  console.log('\nOK: busca semântica validada com sucesso.');
  console.log(`Resultados encontrados: ${result.matches.length}`);

  result.matches.forEach((match, index) => {
    console.log(`\nResultado ${index + 1}`);
    console.log('Score:', match.score);
    console.log('Fonte:', match.metadata.source);
    console.log('Documento:', match.metadata.documentId);
    console.log('Página:', match.metadata.page);
    console.log('Trecho:');
    console.log(String(match.metadata.text || '').slice(0, 700));
  });
}

main().catch((error) => {
  console.error('Erro no teste de busca RAG:', error);
  process.exit(1);
});