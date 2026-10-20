const fs = require('fs');
const client = require('../backend');
const cryptoService = require('./cryptoService');
const fileCryptoService = require('./fileCryptoService');
const { extractDocumentText } = require('./pdfTextExtractor');

const runningJobs = new Set();
let workerTimer = null;

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
  const encrypted = cryptoService.encryptRecord({
    extracted_text: extractionResult.text,
    extraction_error: null,
  }, 'pregnant_documents');
  await client.query(
    `
    UPDATE pregnant_documents
    SET extraction_status = 'done',
        extracted_text = $1,
        extraction_method = $2,
        extraction_confidence = $3,
        extraction_error = NULL,
        extracted_at = CURRENT_TIMESTAMP,
        encryption_key_version = $4,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    `,
    [
      encrypted.extracted_text,
      extractionResult.method,
      extractionResult.confidence,
      cryptoService.getCurrentVersion(),
      documentId,
    ]
  );
}

async function markFailed(documentId, error) {
  const encrypted = cryptoService.encryptRecord(
    { extraction_error: error.message },
    'pregnant_documents'
  );
  await client.query(
    `
    UPDATE pregnant_documents
    SET extraction_status = 'failed',
        extraction_error = $1,
        encryption_key_version = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    `,
    [encrypted.extraction_error, cryptoService.getCurrentVersion(), documentId]
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

    const decryptedDocument = cryptoService.decryptRecord(
      document,
      'pregnant_documents'
    );
    const fileBuffer = await fileCryptoService.readDecryptedFile(
      document.file_path,
      { pregnantId: document.pregnant_id }
    );
    const extractionResult = await extractDocumentText(
      decryptedDocument,
      { buffer: fileBuffer }
    );

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
      logger.error(`Erro inesperado no worker de extração do documento`);
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
  runImmediately = true,
  processPending = processPendingDocumentTextExtractions,
  setIntervalFn = setInterval,
} = {}) {
  if (workerTimer !== null) return workerTimer;

  const runCycle = () => Promise.resolve()
    .then(() => processPending(batchSize))
    .catch((err) => {
      const logger = require('../utils/logger');
      logger.error('Falha no ciclo do worker de extração', { code: 'EXTRACTION_CYCLE_FAILED' });
    });

  workerTimer = setIntervalFn(runCycle, intervalMs);
  if (runImmediately) runCycle();

  return workerTimer;
}

function stopDocumentTextExtractionWorker({ clearIntervalFn = clearInterval } = {}) {
  if (workerTimer === null) return false;

  clearIntervalFn(workerTimer);
  workerTimer = null;
  return true;
}

module.exports = {
  enqueueDocumentTextExtraction,
  markDone,
  markFailed,
  processDocumentTextExtraction,
  processPendingDocumentTextExtractions,
  startDocumentTextExtractionWorker,
  stopDocumentTextExtractionWorker,
};
