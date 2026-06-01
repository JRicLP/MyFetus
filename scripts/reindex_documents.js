const path = require('path');
const { createRequire } = require('module');

const apiRequire = createRequire(path.resolve(__dirname, '..', 'apps', 'api', 'package.json'));
const dotenv = apiRequire('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', 'apps', 'api', '.env') });

const client = apiRequire('./backend');
const {
  processDocumentVectorIndex,
} = apiRequire('./services/vectorIndexWorker');

const force = process.argv.includes('--force');
const batchSize = Number(process.env.VECTOR_INDEX_BATCH_SIZE || 3);

async function findEligibleDocuments() {
  const whereClause = force
    ? "extraction_status = 'done'"
    : "extraction_status = 'done' AND COALESCE(vector_status, 'pending') IN ('pending', 'failed')";

  const result = await client.query(
    `
    SELECT id, document_name
    FROM pregnant_documents
    WHERE ${whereClause}
      AND extracted_text IS NOT NULL
      AND BTRIM(extracted_text) <> ''
    ORDER BY extracted_at ASC NULLS LAST, uploaded_at ASC
    `
  );

  return result.rows;
}

async function resetVectorStatus() {
  await client.query(
    `
    UPDATE pregnant_documents
    SET vector_status = 'pending',
        vector_indexed_at = NULL,
        vector_error = NULL,
        vector_chunk_count = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE extraction_status = 'done'
    `
  );
}

async function main() {
  if (force) {
    console.log('Reindexação forçada: resetando status vetorial dos documentos extraídos...');
    await resetVectorStatus();
  }

  const documents = await findEligibleDocuments();
  let indexed = 0;
  let failed = 0;

  console.log(`Documentos elegíveis para indexação: ${documents.length}`);
  console.log(`Processando em lotes de ${batchSize}...`);

  for (let start = 0; start < documents.length; start += batchSize) {
    const batch = documents.slice(start, start + batchSize);

    for (const document of batch) {
      const position = start + batch.indexOf(document) + 1;

      try {
        const result = await processDocumentVectorIndex(document.id);
        const chunkCount = result?.chunkCount || 0;

        if (result?.skipped) {
          console.log(`[${position}/${documents.length}] doc_${document.id} - ${document.document_name} pulado (${chunkCount} chunks)`);
        } else {
          indexed += 1;
          console.log(`[${position}/${documents.length}] doc_${document.id} - ${document.document_name} OK (${chunkCount} chunks)`);
        }
      } catch (err) {
        failed += 1;
        console.error(`[${position}/${documents.length}] doc_${document.id} - ${document.document_name} falhou: ${err.message}`);
      }
    }
  }

  console.log(`Concluído: ${indexed} indexados, ${failed} falhas.`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('Falha na reindexação:', err.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());

