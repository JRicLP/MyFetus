const fs = require('fs');
const client = require('../backend');
const { extractDocumentText } = require('./pdfTextExtractor');

const runningJobs = new Set();

async function findDocument(documentId) {
  const result = await client.query(
    'SELECT * FROM pregnant_documents WHERE id = $1',
    [documentId]
  );

  return result.rows[0] || null;
}

async function markProcessing(documentId) {
  await client.query(
    `
    UPDATE pregnant_documents
    SET extraction_status = 'processing',
        extraction_error = NULL,
        extraction_attempts = COALESCE(extraction_attempts, 0) + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    `,
    [documentId]
  );
}

async function markDone(documentId, extractionResult) {
  await client.query(
    `
    UPDATE pregnant_documents
    SET extraction_status = 'done',
        extracted_text = $1,
        extraction_method = $2,
        extraction_confidence = $3,
        extraction_error = NULL,
        extracted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    `,
    [
      extractionResult.text,
      extractionResult.method,
      extractionResult.confidence,
      documentId,
    ]
  );
}

async function markFailed(documentId, error) {
  await client.query(
    `
    UPDATE pregnant_documents
    SET extraction_status = 'failed',
        extraction_error = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    `,
    [error.message, documentId]
  );
}

async function processDocumentTextExtraction(documentId) {
  if (runningJobs.has(documentId)) return;

  runningJobs.add(documentId);

  try {
    const document = await findDocument(documentId);

    if (!document) return;

    if (!document.file_path || !fs.existsSync(document.file_path)) {
      throw new Error('Arquivo do documento não encontrado no disco.');
    }

    await markProcessing(documentId);

    const extractionResult = await extractDocumentText(document);

    await markDone(documentId, extractionResult);
  } catch (err) {
    await markFailed(documentId, err);
  } finally {
    runningJobs.delete(documentId);
  }
}

function enqueueDocumentTextExtraction(documentId) {
  setImmediate(() => {
    processDocumentTextExtraction(documentId).catch((err) => {
      console.error(`Erro inesperado no worker de extração do documento ${documentId}:`, err);
    });
  });
}

async function processPendingDocumentTextExtractions(limit = 5) {
  const result = await client.query(
    `
    SELECT id
    FROM pregnant_documents
    WHERE extraction_status = 'pending'
    ORDER BY uploaded_at ASC
    LIMIT $1
    `,
    [limit]
  );

  for (const row of result.rows) {
    await processDocumentTextExtraction(row.id);
  }

  return result.rows.length;
}

function startDocumentTextExtractionWorker({
  intervalMs = Number(process.env.DOCUMENT_EXTRACTION_INTERVAL_MS || 30000),
  batchSize = Number(process.env.DOCUMENT_EXTRACTION_BATCH_SIZE || 5),
} = {}) {
  setInterval(() => {
    processPendingDocumentTextExtractions(batchSize).catch((err) => {
      console.error('Erro no ciclo do worker de extração de PDFs:', err);
    });
  }, intervalMs);
}

module.exports = {
  enqueueDocumentTextExtraction,
  processDocumentTextExtraction,
  processPendingDocumentTextExtractions,
  startDocumentTextExtractionWorker,
};
