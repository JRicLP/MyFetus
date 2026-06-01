const client = require('../backend');
const { generateChunkedEmbeddings } = require('./embeddingService');
const { getPineconeIndex } = require('../utils/pineconeClient');

const runningJobs = new Set();
const UPSERT_BATCH_SIZE = 100;

async function findDocument(documentId) {
  const result = await client.query(
    'SELECT * FROM pregnant_documents WHERE id = $1',
    [documentId]
  );

  return result.rows[0] || null;
}

async function findPendingDocuments(limit = 3) {
  const result = await client.query(
    `
    SELECT *
    FROM pregnant_documents
    WHERE extraction_status = 'done'
      AND COALESCE(vector_status, 'pending') = 'pending'
      AND extracted_text IS NOT NULL
      AND BTRIM(extracted_text) <> ''
    ORDER BY extracted_at ASC NULLS LAST, uploaded_at ASC
    LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}

async function markProcessing(documentId) {
  await client.query(
    `
    UPDATE pregnant_documents
    SET vector_status = 'processing',
        vector_error = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    `,
    [documentId]
  );
}

async function markDone(documentId, chunkCount) {
  await client.query(
    `
    UPDATE pregnant_documents
    SET vector_status = 'done',
        vector_indexed_at = CURRENT_TIMESTAMP,
        vector_error = NULL,
        vector_chunk_count = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    `,
    [chunkCount, documentId]
  );
}

async function markFailed(documentId, error) {
  await client.query(
    `
    UPDATE pregnant_documents
    SET vector_status = 'failed',
        vector_error = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    `,
    [error.message, documentId]
  );
}

async function markSkipped(documentId, reason) {
  await client.query(
    `
    UPDATE pregnant_documents
    SET vector_status = 'skipped',
        vector_error = $1,
        vector_chunk_count = 0,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    `,
    [reason, documentId]
  );
}

function buildVectors(document, chunks) {
  return chunks.map((chunk) => ({
    id: `doc_${document.id}_chunk_${chunk.chunk_index}`,
    values: chunk.embedding,
    metadata: {
      document_id: Number(document.id),
      pregnant_id: Number(document.pregnant_id),
      document_type: document.document_type || '',
      document_name: document.document_name || '',
      extraction_method: document.extraction_method || '',
      chunk_index: chunk.chunk_index,
      chunk_total: chunk.chunk_total,
      extracted_at: document.extracted_at ? new Date(document.extracted_at).toISOString() : '',
      chunk_text: chunk.text,
    },
  }));
}

async function upsertVectors(index, vectors) {
  for (let start = 0; start < vectors.length; start += UPSERT_BATCH_SIZE) {
    const batch = vectors.slice(start, start + UPSERT_BATCH_SIZE);
    await index.upsert(batch);
  }
}

async function processDocumentVectorIndex(documentId) {
  if (runningJobs.has(documentId)) return null;

  runningJobs.add(documentId);

  try {
    const document = await findDocument(documentId);

    if (!document) return null;

    await markProcessing(documentId);

    if (document.extraction_status !== 'done') {
      await markSkipped(documentId, 'Documento ainda não teve extração de texto concluída.');
      return { document, chunkCount: 0, skipped: true };
    }

    if (!document.extracted_text || !document.extracted_text.trim()) {
      await markSkipped(documentId, 'Documento sem texto extraído para indexação vetorial.');
      return { document, chunkCount: 0, skipped: true };
    }

    const chunks = await generateChunkedEmbeddings(document.extracted_text);

    if (chunks.length === 0) {
      await markSkipped(documentId, 'Nenhum chunk gerado para indexação vetorial.');
      return { document, chunkCount: 0, skipped: true };
    }

    const index = await getPineconeIndex();
    const vectors = buildVectors(document, chunks);

    await upsertVectors(index, vectors);
    await markDone(documentId, chunks.length);

    return { document, chunkCount: chunks.length, skipped: false };
  } catch (err) {
    await markFailed(documentId, err);
    throw err;
  } finally {
    runningJobs.delete(documentId);
  }
}

async function processPendingVectorIndexes(limit = 3) {
  const documents = await findPendingDocuments(limit);
  let processed = 0;

  for (const document of documents) {
    await processDocumentVectorIndex(document.id);
    processed += 1;
  }

  return processed;
}

function startVectorIndexWorker({
  intervalMs = Number(process.env.VECTOR_INDEX_INTERVAL_MS || 60000),
  batchSize = Number(process.env.VECTOR_INDEX_BATCH_SIZE || 3),
} = {}) {
  setInterval(() => {
    processPendingVectorIndexes(batchSize).catch((err) => {
      console.error('Erro no ciclo do worker de indexação vetorial:', err);
    });
  }, intervalMs);
}

module.exports = {
  buildVectors,
  processDocumentVectorIndex,
  processPendingVectorIndexes,
  startVectorIndexWorker,
  upsertVectors,
};

