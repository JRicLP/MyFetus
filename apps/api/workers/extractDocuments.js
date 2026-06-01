require('dotenv').config();

const client = require('../backend');
const { processPendingDocumentTextExtractions } = require('../services/documentExtractionWorker');

async function main() {
  const limit = Number(process.argv[2] || process.env.DOCUMENT_EXTRACTION_BATCH_SIZE || 5);
  const processed = await processPendingDocumentTextExtractions(limit);

  console.log(`Worker de extração finalizado. Documentos processados: ${processed}`);
}

main()
  .catch((err) => {
    console.error('Erro ao executar worker de extração:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
