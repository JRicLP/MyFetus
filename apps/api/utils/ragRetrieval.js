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
async function semanticSearch(query, queryEmbedding, chunks = [], topK = 5, filtros = {}) {
  console.log("DEBUG: Iniciando busca com query:", query);
  
  // 1. Definições iniciais de escopo
  const startTime = Date.now();
  let resultados = []; // Declarada no escopo principal

  // 2. Validação básica
  if (!query || query.trim().length === 0) {
    return { query, resultados: [], total: 0, tempo_ms: 0, erro: 'Query vazia' };
  }

  // 3. Garantir chunks (se vazio, retorna cedo para evitar erros)
  const listaChunks = Array.isArray(chunks) ? chunks : [];
  if (listaChunks.length === 0) {
    console.warn("Aviso: semanticSearch recebeu lista de chunks vazia.");
    return { query, resultados: [], total: 0, tempo_ms: Date.now() - startTime };
  }

  // 4. Filtragem
  let chunksFilterados = listaChunks;
  if (filtros.especialidade) {
    chunksFilterados = chunksFilterados.filter(c => c.metadados?.especialidade?.toLowerCase() === filtros.especialidade.toLowerCase());
  }
  if (filtros.fonte) {
    chunksFilterados = chunksFilterados.filter(c => c.metadados?.fonte?.toLowerCase() === filtros.fonte.toLowerCase());
  }
  if (filtros.tema) {
    chunksFilterados = chunksFilterados.filter(c => c.metadados?.tema?.toLowerCase() === filtros.tema.toLowerCase());
  }

  // const queryEmbedding = generateQueryEmbedding(query);

  // Adicione isto no seu ragRetrieval.js antes de .map()
  console.log("DEBUG: Dimensão da Query Embedding:", queryEmbedding.length);
  console.log("DEBUG: Dimensão do Chunk Embedding:", chunks[0].embedding.length);

  // 5. Embedding e Similaridade (Declarados aqui)
  const resultadosComScore = chunksFilterados.map(chunk => ({
    chunk,
    // Proteção: Se embedding não existir, usa um vetor de zeros ou pula o cálculo
    relevancia: chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0
  }));

  // 6. Ordenação (Agora resultadosOrdenados está sempre definido)
  const resultadosOrdenados = (resultadosComScore || [])
    .sort((a, b) => b.relevancia - a.relevancia)
    .slice(0, topK);

  // 7. Mapeamento final
  resultados = resultadosOrdenados.map(({ chunk, relevancia }) => ({
    trecho: chunk.texto,
    fonte: chunk.metadados?.fonte || 'Desconhecido',
    especialidade: chunk.metadados?.especialidade || 'Geral',
    tema: chunk.metadados?.tema || 'Geral',
    relevancia: Number(normalizeSimilarity(relevancia).toFixed(4)),
    documento_id: chunk.id
  }));

  console.log(`Busca finalizada: ${resultados.length} resultados encontrados.`);

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
  if (!chunks) { 
    return { totalChunks: 0, status: 'Não inicializado' };
  }

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
