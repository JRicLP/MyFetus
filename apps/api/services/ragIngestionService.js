/**
 * ragIngestionService.js
 *
 * Orquestra a ingestão RAG:
 * PDF -> texto -> chunks -> embeddings -> Pinecone.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { createChunks } = require('./chunkingService');
const { generateEmbedding } = require('./embeddingService');
const { upsertVectors } = require('./vectorStoreService');
const {
  assertIngestionAllowed,
  buildSourceMetadata,
  evaluateGuidelines,
  loadManifest,
} = require('./ragManifestGate');

const GUIDELINES_DIR = path.join(__dirname, '..', 'data', 'guidelines');
const PINECONE_NAMESPACE = process.env.PINECONE_NAMESPACE || 'guidelines';

function loadPdfTextExtractor() {
  const possiblePaths = [
    '../utils/pdfTextExtractor',
    '../services/pdfTextExtractor',
    './pdfTextExtractor',
  ];

  for (const extractorPath of possiblePaths) {
    try {
      return require(extractorPath);
    } catch (error) {
      // Tenta o próximo caminho.
    }
  }

  throw new Error(
    'Não foi possível encontrar pdfTextExtractor.js em utils ou services.'
  );
}

const { extractDocumentText } = loadPdfTextExtractor();

function listPdfFiles() {
  if (!fs.existsSync(GUIDELINES_DIR)) {
    throw new Error(`Pasta não encontrada: ${GUIDELINES_DIR}`);
  }

  return fs
    .readdirSync(GUIDELINES_DIR)
    .filter((fileName) => fileName.toLowerCase().endsWith('.pdf'));
}

async function extractTextFromPdf(filePath, fileName) {
  const result = await extractDocumentText({
    file_path: filePath,
    document_name: fileName,
    document_type: 'application/pdf',
  });

  if (!result || !result.text || result.text.trim().length === 0) {
    throw new Error(`Não foi possível extrair texto de ${fileName}`);
  }

  return result.text;
}

function buildPineconeRecord(chunk, embedding, sourceMetadata) {
  return {
    id: chunk.id,
    values: embedding,
    metadata: {
      ...chunk.metadata,
      ...sourceMetadata,
      text: chunk.text,
    },
  };
}

async function ingestSingleDocument({ fileName, filePath, source }, manifestVersion) {
  const sourceMetadata = buildSourceMetadata(source, manifestVersion);

  const logger = require('../utils/logger');
  logger.info('Ingestão RAG: documento iniciado');
  logger.info('Ingestão RAG: fonte');

  const text = await extractTextFromPdf(filePath, fileName);

  const chunks = createChunks(text, {
    source: source.title,
    documentId: source.documentId,
    section: (source.topics && source.topics[0]) || 'Geral',
    documentType: source.documentType,
  });

  logger.info('Ingestão RAG: chunks gerados');

  const records = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const logger = require('../utils/logger');
    logger.info('Ingestão RAG: gerando embedding');

    const embedding = await generateEmbedding(chunk.text, 'passage');
    const record = buildPineconeRecord(chunk, embedding, sourceMetadata);

    records.push(record);
  }

  
  logger.info('Ingestão RAG: enviando vetores');

  const result = await upsertVectors(records, PINECONE_NAMESPACE);

  logger.info('Ingestão RAG: documento indexado');
  logger.info('Ingestão RAG: vetores enviados');

  return {
    fileName,
    source: source.title,
    documentId: source.documentId,
    sha256: source.sha256,
    chunks: chunks.length,
    vectors: result.upsertedCount,
  };
}

async function ingestGuidelines() {
  // O gate roda antes de qualquer extração ou embedding: fonte não aprovada
  // ou com hash diferente do manifesto interrompe a ingestão inteira.
  const manifest = loadManifest();
  const gate = assertIngestionAllowed(
    evaluateGuidelines({ guidelinesDir: GUIDELINES_DIR, manifest })
  );

  const logger = require('../utils/logger');
  logger.info('Ingestão RAG: PDFs liberados pelo manifesto', {
    fileCount: gate.approved.length,
    manifestVersion: gate.manifestVersion,
  });

  const results = [];

  for (const document of gate.approved) {
    const result = await ingestSingleDocument(document, gate.manifestVersion);
    results.push(result);
  }

  return {
    namespace: PINECONE_NAMESPACE,
    manifestVersion: gate.manifestVersion,
    documents: results.length,
    results,
  };
}

module.exports = {
  ingestGuidelines,
  ingestSingleDocument,
  listPdfFiles,
};