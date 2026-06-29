/**
 * embeddingService.js
 *
 * Gera embeddings usando multilingual-e5-small.
 * O modelo é carregado uma vez e reaproveitado nas próximas chamadas.
 */

const DEFAULT_MODEL = 'Xenova/multilingual-e5-small';
const DEFAULT_DIMENSION = 384; 

let extractorPromise = null;

async function getExtractor() {
  if (!extractorPromise) {
    // 2. Adicione log para ver o que ele ESTÁ a carregar
    console.log("DEBUG: Iniciando carregamento do modelo:", DEFAULT_MODEL);
    
    extractorPromise = import('@huggingface/transformers')
      .then(({ pipeline }) => {
        return pipeline('feature-extraction', DEFAULT_MODEL);
      });
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

  // LOG DE SEGURANÇA
  console.log("DEBUG INTERNO: Modelo usado:", DEFAULT_MODEL);
  console.log("DEBUG INTERNO: Dimensão calculada:", embedding.length);
  console.log("DEBUG INTERNO: Dimensão esperada:", DEFAULT_DIMENSION);

  if (embedding.length !== DEFAULT_DIMENSION) {
    // Se entrar aqui, ele vai atirar o erro que esperávamos
    throw new Error(`DIMENSÃO ERRADA: Recebi ${embedding.length}, esperava ${DEFAULT_DIMENSION}`);
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