/**
 * ragIngestionService.js
 *
 * Orquestra a ingestão RAG:
 * PDF -> texto -> chunks -> embeddings -> Pinecone.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { createChunks, slugify } = require('./chunkingService');
const { generateEmbedding } = require('./embeddingService');
const { upsertVectors } = require('./vectorStoreService');

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

function getDocumentInfo(fileName) {
  const lowerFileName = fileName.toLowerCase();

  if (lowerFileName.includes('febrasgo')) {
    return {
      source: 'FEBRASGO - Predição e prevenção da pré-eclâmpsia',
      documentId: 'febrasgo-predicao-prevencao-pre-eclampsia-2023',
      language: 'pt-BR',
      documentType: 'guideline',
      section: 'Pré-eclâmpsia',
    };
  }

  if (lowerFileName.includes('acog')) {
    return {
      source: 'ACOG - Gestational Hypertension and Preeclampsia',
      documentId: 'acog-gestational-hypertension-preeclampsia-2020',
      language: 'en',
      documentType: 'guideline',
      section: 'Hypertension and preeclampsia',
    };
  }

  if (
    lowerFileName.includes('gestacao_alto_risco') ||
    lowerFileName.includes('alto_risco')
  ) {
    return {
      source: 'Ministério da Saúde - Manual de Gestação de Alto Risco',
      documentId: 'manual-gestacao-alto-risco-ms-2022',
      language: 'pt-BR',
      documentType: 'manual',
      section: 'Gestação de alto risco',
    };
  }

  if (
    lowerFileName.includes('caderno32') ||
    lowerFileName.includes('baixo_risco')
  ) {
    return {
      source: 'Ministério da Saúde - Atenção ao Pré-Natal de Baixo Risco',
      documentId: 'caderno32-prenatal-baixo-risco-ms-2012',
      language: 'pt-BR',
      documentType: 'manual',
      section: 'Pré-natal de baixo risco',
    };
  }

  if (lowerFileName.includes('somanz')) {
    return {
      source: 'SOMANZ - Hypertension in Pregnancy Guideline 2023',
      documentId: 'somanz-hypertension-pregnancy-2023',
      language: 'en',
      documentType: 'guideline',
      section: 'Hypertension in pregnancy',
    };
  }

  const fallbackId = slugify(fileName.replace(/\.pdf$/i, ''));

  return {
    source: fileName,
    documentId: fallbackId,
    language: 'unknown',
    documentType: 'guideline',
    section: 'Geral',
  };
}

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

function buildPineconeRecord(chunk, embedding, documentInfo) {
  return {
    id: chunk.id,
    values: embedding,
    metadata: {
      ...chunk.metadata,
      text: chunk.text,
      language: documentInfo.language,
    },
  };
}

async function ingestSingleDocument(fileName) {
  const filePath = path.join(GUIDELINES_DIR, fileName);
  const documentInfo = getDocumentInfo(fileName);

  console.log(`\nIniciando documento: ${fileName}`);
  console.log(`Fonte: ${documentInfo.source}`);

  const text = await extractTextFromPdf(filePath, fileName);

  const chunks = createChunks(text, {
    source: documentInfo.source,
    documentId: documentInfo.documentId,
    section: documentInfo.section,
    documentType: documentInfo.documentType,
  });

  console.log(`Chunks gerados: ${chunks.length}`);

  const records = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];

    console.log(`Gerando embedding ${index + 1}/${chunks.length}...`);

    const embedding = await generateEmbedding(chunk.text, 'passage');
    const record = buildPineconeRecord(chunk, embedding, documentInfo);

    records.push(record);
  }

  console.log('Enviando vetores para o Pinecone...');

  const result = await upsertVectors(records, PINECONE_NAMESPACE);

  console.log(`Documento indexado: ${fileName}`);
  console.log(`Vetores enviados: ${result.upsertedCount}`);

  return {
    fileName,
    source: documentInfo.source,
    documentId: documentInfo.documentId,
    chunks: chunks.length,
    vectors: result.upsertedCount,
  };
}

async function ingestGuidelines() {
  const pdfFiles = listPdfFiles();

  if (pdfFiles.length === 0) {
    throw new Error(`Nenhum PDF encontrado em ${GUIDELINES_DIR}`);
  }

  console.log(`PDFs encontrados: ${pdfFiles.length}`);
  console.log(pdfFiles);

  const results = [];

  for (const fileName of pdfFiles) {
    const result = await ingestSingleDocument(fileName);
    results.push(result);
  }

  return {
    namespace: PINECONE_NAMESPACE,
    documents: results.length,
    results,
  };
}

module.exports = {
  ingestGuidelines,
  ingestSingleDocument,
  listPdfFiles,
  getDocumentInfo,
};