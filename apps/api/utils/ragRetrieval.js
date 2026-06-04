/**
 * ragRetrieval.js
 * 
 * Lógica de busca semântica para RAG
 * Implementa cosine similarity e ranking de resultados
 * 
 * Em produção, será substituído por chamadas a Vector DB (Pinecone, Weaviate, etc.)
 */

/**
 * Calcula similaridade de cosseno entre dois vetores
 * @param {number[]} vec1 - Primeiro vetor
 * @param {number[]} vec2 - Segundo vetor
 * @returns {number} Similaridade entre 0 e 1
 */
function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error('Vetores devem ter a mesma dimensão');
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    magnitude1 += vec1[i] * vec1[i];
    magnitude2 += vec2[i] * vec2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

function normalizeSimilarity(score) {
  const normalized = (score + 1) / 2;
  if (normalized < 0) {
    return 0;
  }

  if (normalized > 1) {
    return 1;
  }

  return normalized;
}

/**
 * Gera embedding mock para uma query (em produção, seria do modelo real)
 * Para mock, usa hash simples da query
 * @param {string} query - Texto da query
 * @returns {number[]} Embedding de dimensão 768
 */
function generateQueryEmbedding(query) {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  const arr = new Float32Array(768);
  for (let i = 0; i < 768; i++) {
    arr[i] = Math.sin(hash + i) * 0.5;
  }

  return Array.from(arr);
}

/**
 * Busca semântica em chunks usando cosine similarity
 * @param {string} query - Texto da query
 * @param {Array} chunks - Array de chunks com embeddings
 * @param {number} topK - Número máximo de resultados (default: 5)
 * @param {Object} filtros - Filtros opcionais { especialidade, fonte, tema }
 * @returns {Object} Resultado estruturado com ranking
 */
function semanticSearch(query, chunks, topK = 5, filtros = {}) {
  const startTime = Date.now();

  if (!query || query.trim().length === 0) {
    return {
      query,
      resultados: [],
      total: 0,
      tempo_ms: Date.now() - startTime,
      erro: 'Query vazia'
    };
  }

  // Gera embedding da query
  const queryEmbedding = generateQueryEmbedding(query);

  // Aplica filtros opcionais
  let chunksFilterados = chunks;
  if (filtros.especialidade) {
    chunksFilterados = chunksFilterados.filter(
      c => c.metadados.especialidade.toLowerCase() === filtros.especialidade.toLowerCase()
    );
  }
  if (filtros.fonte) {
    chunksFilterados = chunksFilterados.filter(
      c => c.metadados.fonte.toLowerCase() === filtros.fonte.toLowerCase()
    );
  }
  if (filtros.tema) {
    chunksFilterados = chunksFilterados.filter(
      c => c.metadados.tema.toLowerCase() === filtros.tema.toLowerCase()
    );
  }

  // Calcula similaridade para cada chunk
  const resultadosComScore = chunksFilterados.map(chunk => ({
    chunk,
    relevancia: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  // Ordena por relevância (decrescente) e pega top K
  const resultadosOrdenados = resultadosComScore
    .sort((a, b) => b.relevancia - a.relevancia)
    .slice(0, topK);

  // Formata resposta
  const resultados = resultadosOrdenados.map(({ chunk, relevancia }) => ({
    trecho: chunk.texto,
    fonte: chunk.metadados.fonte,
    especialidade: chunk.metadados.especialidade,
    tema: chunk.metadados.tema,
    relevancia: Number(normalizeSimilarity(relevancia).toFixed(4)),
    documento_id: chunk.id
  }));

  return {
    query,
    resultados,
    total: resultados.length,
    tempo_ms: Date.now() - startTime
  };
}

/**
 * Obtém estatísticas sobre os chunks disponíveis
 * @param {Array} chunks - Array de chunks
 * @returns {Object} Estatísticas de disponibilidade
 */
function getChunkStats(chunks) {
  const especialidades = new Set();
  const fontes = new Set();
  const temas = new Set();

  chunks.forEach(chunk => {
    especialidades.add(chunk.metadados.especialidade);
    fontes.add(chunk.metadados.fonte);
    temas.add(chunk.metadados.tema);
  });

  return {
    total_chunks: chunks.length,
    especialidades: Array.from(especialidades),
    fontes: Array.from(fontes),
    temas: Array.from(temas)
  };
}

module.exports = {
  cosineSimilarity,
  normalizeSimilarity,
  generateQueryEmbedding,
  semanticSearch,
  getChunkStats
};
