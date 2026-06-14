/**
 * ragController.js
 * 
 * Controlador para endpoints de RAG (Retrieval-Augmented Generation)
 * Gerencia requisições de busca semântica e consulta ao knowledge base
 */

const vectorStoreService = require('../services/vectorStoreService');
const embeddingService = require('../services/embeddingService');

/**
 * Busca semântica no knowledge base
 * Endpoint: POST /api/internal/rag/search
 */
const searchKnowledgeBase = async (req, res) => {
  try {
    const body = req.body || {};
    const query = body.query;
    const topK = body.topK ?? 5;
    
    // CAPTURA DINÂMICA DOS FILTROS (Alinhado com o contrato e o script Bash)
    const filtros = body.filtros || {};

    // Validação básica
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'query é obrigatória e deve ser uma string'
      });
    }

    if (query.trim().length === 0) {
      return res.status(400).json({
        error: 'query não pode estar vazia'
      });
    }

    if (!Number.isInteger(topK) || topK < 1 || topK > 20) {
      return res.status(400).json({
        error: 'topK deve ser um inteiro entre 1 e 20'
      });
    }

    const startTime = Date.now();

    // 1. Aplica a regra de negócio do prefixo exigida pelo contrato
    const prefixedQuery = `query: ${query}`; 

    // 2. Gera o vetor real com a string prefixada
    const queryEmbedding = await embeddingService.generateEmbedding(prefixedQuery);

    // 3. Consulta o Pinecone no namespace correto 
    const pineconeResult = await vectorStoreService.queryVectors(queryEmbedding, { 
        namespace: 'guidelines', 
        topK, 
        filter: Object.keys(filtros).length > 0 ? filtros : undefined
    });

    // 4. Mapeia a resposta usando estritamente o contrato de metadados
    const resultados = pineconeResult.matches.map(match => ({
        trecho: match.metadata.text, 
        fonte: match.metadata.source, 
        pagina: match.metadata.page, 
        secao: match.metadata.section,
        relevancia: Number(match.score.toFixed(4)), 
        documento_id: match.metadata.documentId
    }));

    return res.status(200).json({
        source: 'rag-v2-pinecone',
        query: query,
        resultados: resultados,
        total: resultados.length,
        tempo_ms: Date.now() - startTime
    });
  } catch (error) {
    // ... resto do código (catch)
    console.error('Erro ao buscar knowledge base:', error.message);
    return res.status(500).json({
      error: 'Falha ao buscar no knowledge base',
      details: error.message
    });
  }
};

/**
 * Obtém estatísticas sobre chunks disponíveis (debug/admin)
 * Endpoint: GET /api/internal/rag/stats
 */
const getRAGStats = async (req, res) => {
  try {
    const stats = await vectorStoreService.describeIndexStats();

    return res.status(200).json({
      source: 'rag-v2-pinecone',
      stats,
      ambiente: process.env.NODE_ENV || 'test'
    });
  } catch (error) {
    console.error('Erro ao obter stats:', error.message);
    return res.status(500).json({
      error: 'Falha ao obter estatísticas',
      details: error.message
    });
  }
};

module.exports = {
  searchKnowledgeBase,
  getRAGStats
};
