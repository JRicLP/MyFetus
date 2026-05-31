/**
 * chunkingService.js
 *
 * Responsável por dividir textos grandes em partes menores para indexação no RAG.
 * Cada chunk mantém metadados para permitir rastrear a origem da resposta.
 */

const DEFAULT_CHUNK_SIZE = Number(process.env.RAG_CHUNK_SIZE || 900);
const DEFAULT_CHUNK_OVERLAP = Number(process.env.RAG_CHUNK_OVERLAP || 150);

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitIntoParagraphs(text) {
  return normalizeWhitespace(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function detectPageFromText(text, fallbackPage = null) {
  const match = String(text || '').match(/--- Página\s+(\d+)\s+---/i);
  return match ? Number(match[1]) : fallbackPage;
}

function buildChunkId(documentId, chunkIndex) {
  return `${slugify(documentId)}-${chunkIndex}`;
}

function createChunks(text, metadata = {}, options = {}) {
  const normalizedText = normalizeWhitespace(text);

  if (!normalizedText) {
    return [];
  }

  const chunkSize = Number(options.chunkSize || DEFAULT_CHUNK_SIZE);
  const chunkOverlap = Number(options.chunkOverlap || DEFAULT_CHUNK_OVERLAP);

  if (chunkOverlap >= chunkSize) {
    throw new Error('chunkOverlap deve ser menor que chunkSize.');
  }

  const documentId = metadata.documentId || slugify(metadata.source || 'document');
  const paragraphs = splitIntoParagraphs(normalizedText);

  const rawChunks = [];
  let currentChunk = '';
  let currentPage = metadata.page || null;

  for (const paragraph of paragraphs) {
    const paragraphPage = detectPageFromText(paragraph, currentPage);
    if (paragraphPage) currentPage = paragraphPage;

    const candidate = currentChunk
      ? `${currentChunk}\n\n${paragraph}`
      : paragraph;

    if (candidate.length <= chunkSize) {
      currentChunk = candidate;
      continue;
    }

    if (currentChunk) {
      rawChunks.push({
        text: currentChunk,
        page: currentPage,
      });
    }

    currentChunk = paragraph;
  }

  if (currentChunk) {
    rawChunks.push({
      text: currentChunk,
      page: currentPage,
    });
  }

  const chunks = [];

  for (let index = 0; index < rawChunks.length; index += 1) {
    const previousText = index > 0 ? rawChunks[index - 1].text : '';
    const overlapText = previousText
      ? previousText.slice(Math.max(0, previousText.length - chunkOverlap))
      : '';

    const chunkText = overlapText
      ? `${overlapText}\n\n${rawChunks[index].text}`
      : rawChunks[index].text;

    chunks.push({
      id: buildChunkId(documentId, index),
      text: normalizeWhitespace(chunkText),
      metadata: {
        source: metadata.source || 'Fonte não informada',
        documentId,
        page: rawChunks[index].page || metadata.page || null,
        section: metadata.section || 'Geral',
        documentType: metadata.documentType || 'guideline',
        chunkIndex: index,
        totalChunks: rawChunks.length,
        indexedAt: metadata.indexedAt || new Date().toISOString(),
      },
    });
  }

  return chunks;
}

module.exports = {
  createChunks,
  normalizeWhitespace,
  slugify,
};