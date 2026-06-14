/**
 * ingestRagDocuments.js
 *
 * Script manual para indexar as diretrizes no Pinecone.
 */

require('dotenv').config();

const { ingestGuidelines } = require('../services/ragIngestionService');

async function main() {
  console.log('Iniciando ingestão RAG...');

  const result = await ingestGuidelines();

  console.log('\nIngestão finalizada com sucesso.');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('Erro na ingestão RAG:', error);
  process.exit(1);
});