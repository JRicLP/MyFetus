/**
 * embeddingService.js
 *
 * Gera embeddings usando multilingual-e5-small.
 * O modelo é carregado uma vez e reaproveitado nas próximas chamadas.
 */

const DEFAULT_MODEL = process.env.EMBEDDING_MODEL || 'Xenova/multilingual-e5-small';
const DEFAULT_DIMENSION = Number(process.env.EMBEDDING_DIMENSION || 384);

let extractorPromise = null;

async function getExtractor() {
  if (!extractorPromise) {
    // Dynamic import porque @huggingface/transformers usa ESM.
    extractorPromise = import('@huggingface/transformers')
      .then(({ pipeline }) => pipeline('feature-extraction', DEFAULT_MODEL));
  }

  return extractorPromise;
}

function normalizeEmbeddingInput(text, inputType = 'passage') {
  const cleanText = String(text || '').trim();

  if (!cleanText) {
    throw new Error('Texto vazio não pode gerar embedding.');
  }

  // O modelo E5 usa prefixos diferentes para documentos e perguntas.
  if (cleanText.startsWith('passage:') || cleanText.startsWith('query:')) {
    return cleanText;
  }

  return `${inputType}: ${cleanText}`;
}

async function generateEmbedding(text, inputType = 'passage') {
  const extractor = await getExtractor();
  const formattedText = normalizeEmbeddingInput(text, inputType);

  const output = await extractor(formattedText, {
    pooling: 'mean',
    normalize: true,
  });

  const embedding = Array.from(output.data);

  if (embedding.length !== DEFAULT_DIMENSION) {
    throw new Error(
      `Dimensão inesperada do embedding: ${embedding.length}. Esperado: ${DEFAULT_DIMENSION}.`
    );
  }

  return embedding;
}

async function generateEmbeddings(texts, inputType = 'passage') {
  if (!Array.isArray(texts)) {
    throw new Error('generateEmbeddings espera uma lista de textos.');
  }

  const embeddings = [];

  // Processa em sequência para evitar estourar memória no notebook/PC.
  for (const text of texts) {
    const embedding = await generateEmbedding(text, inputType);
    embeddings.push(embedding);
  }

  return embeddings;
}

module.exports = {
  generateEmbedding,
  generateEmbeddings,
  normalizeEmbeddingInput,
};