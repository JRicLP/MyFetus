const { createOpenAIEmbeddings } = require('./embeddingService');
const { getPineconeIndex } = require('../utils/pineconeClient');
const { sanitizeForLLM } = require('../utils/piiSanitizer');

function normalizeTopK(topK) {
  const parsed = Number(topK || 5);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 5;
  }

  return Math.min(parsed, 20);
}

async function semanticSearchDocuments({ query, pregnant_id, top_k = 5 }) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Query de busca semântica é obrigatória.');
  }

  if (!pregnant_id) {
    throw new Error('pregnant_id é obrigatório para busca semântica.');
  }

  const sanitizedQuery = sanitizeForLLM(query.trim());
  const [queryEmbedding] = await createOpenAIEmbeddings([sanitizedQuery]);
  const index = await getPineconeIndex();

  const response = await index.query({
    vector: queryEmbedding,
    topK: normalizeTopK(top_k),
    includeMetadata: true,
    filter: {
      pregnant_id: { $eq: Number(pregnant_id) },
    },
  });

  return (response.matches || []).map((match) => {
    const metadata = match.metadata || {};

    return {
      document_id: metadata.document_id,
      document_name: metadata.document_name,
      document_type: metadata.document_type,
      score: match.score,
      chunk_text: metadata.chunk_text || '',
      chunk_index: metadata.chunk_index,
      chunk_total: metadata.chunk_total,
    };
  });
}

module.exports = {
  normalizeTopK,
  semanticSearchDocuments,
};
