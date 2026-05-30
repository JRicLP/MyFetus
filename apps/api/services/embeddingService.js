require('dotenv').config();

const OpenAI = require('openai');
const { sanitizeForLLM } = require('../utils/piiSanitizer');

const DEFAULT_MODEL = process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small';
const DEFAULT_DIMENSION = Number(process.env.EMBEDDINGS_DIMENSION || 1536);
const DEFAULT_CHUNK_SIZE = Number(process.env.VECTOR_CHUNK_SIZE || 500);
const DEFAULT_CHUNK_OVERLAP = Number(process.env.VECTOR_CHUNK_OVERLAP || 50);

let openaiClient = null;

function getOpenAIClient() {
  if (openaiClient) {
    return openaiClient;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Variavel de ambiente obrigatoria ausente: OPENAI_API_KEY');
  }

  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

function resetEmbeddingClientForTests() {
  openaiClient = null;
}

function tokenize(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function splitIntoPreferredUnits(text) {
  return String(text || '')
    .split(/(?=---\s*Pagina\s+\d+\s*---|---\s*Página\s+\d+\s*---)|\n{2,}/g)
    .map((unit) => unit.trim())
    .filter(Boolean);
}

function createTextChunks(text, {
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
} = {}) {
  const normalizedText = String(text || '').trim();

  if (!normalizedText) {
    return [];
  }

  if (chunkSize <= 0) {
    throw new Error('VECTOR_CHUNK_SIZE deve ser maior que zero.');
  }

  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error('VECTOR_CHUNK_OVERLAP deve ser maior ou igual a zero e menor que VECTOR_CHUNK_SIZE.');
  }

  const units = splitIntoPreferredUnits(normalizedText);
  const chunks = [];
  let currentTokens = [];
  let previousOverlapTokens = [];

  function flushCurrent() {
    if (currentTokens.length > 0) {
      chunks.push(currentTokens.join(' '));
      previousOverlapTokens = currentTokens.slice(-overlap);
      currentTokens = overlap > 0 ? [...previousOverlapTokens] : [];
    }
  }

  for (const unit of units) {
    const unitTokens = tokenize(unit);

    if (currentTokens.length + unitTokens.length <= chunkSize) {
      currentTokens.push(...unitTokens);
      continue;
    }

    if (currentTokens.length > (overlap > 0 ? previousOverlapTokens.length : 0)) {
      flushCurrent();
    }

    let remainingTokens = unitTokens;

    while (remainingTokens.length > 0) {
      const available = chunkSize - currentTokens.length;
      currentTokens.push(...remainingTokens.slice(0, available));
      remainingTokens = remainingTokens.slice(available);

      if (remainingTokens.length > 0) {
        flushCurrent();
      }
    }
  }

  flushCurrent();

  return chunks;
}

async function createOpenAIEmbeddings(texts, {
  model = DEFAULT_MODEL,
  dimensions = DEFAULT_DIMENSION,
  client = getOpenAIClient(),
} = {}) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  try {
    const response = await client.embeddings.create({
      model,
      input: texts,
      encoding_format: 'float',
      dimensions,
    });

    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  } catch (err) {
    throw new Error(`Falha ao gerar embeddings: ${err.message}`);
  }
}

async function generateChunkedEmbeddings(text, options = {}) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return [];
  }

  const sanitizedText = sanitizeForLLM(text);
  const chunks = createTextChunks(sanitizedText, options);

  if (chunks.length === 0) {
    return [];
  }

  const embedTexts = options.embedTexts || ((chunkTexts) => createOpenAIEmbeddings(chunkTexts, options));
  const embeddings = await embedTexts(chunks);

  if (!Array.isArray(embeddings) || embeddings.length !== chunks.length) {
    throw new Error('Provedor de embeddings retornou quantidade inesperada de vetores.');
  }

  return chunks.map((chunkText, index) => ({
    chunk_index: index,
    chunk_total: chunks.length,
    text: chunkText,
    embedding: embeddings[index],
  }));
}

module.exports = {
  createOpenAIEmbeddings,
  createTextChunks,
  generateChunkedEmbeddings,
  resetEmbeddingClientForTests,
  tokenize,
};
