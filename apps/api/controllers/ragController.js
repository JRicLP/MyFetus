/**
 * ragController.js
 * 
 * Controlador para endpoints de RAG (Retrieval-Augmented Generation)
 * Gerencia requisições de busca semântica e consulta ao knowledge base
 */

const { semanticSearch, getChunkStats } = require('../utils/ragRetrieval');
const { MOCK_CHUNKS } = require('../data/rag-mock-data');

/**
 * Busca semântica no knowledge base
 * Endpoint: POST /api/internal/rag/search
 */
const searchKnowledgeBase = async (req, res) => {
  try {
    const body = req.body || {};
    const { query, especialidade, fonte, tema } = body;
    const topK = body.topK ?? 5;

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

    // Monta filtros opcionais
    const filtros = {};
    if (especialidade) filtros.especialidade = especialidade;
    if (fonte) filtros.fonte = fonte;
    if (tema) filtros.tema = tema;

    // Executa busca semântica
    const resultado = semanticSearch(query, MOCK_CHUNKS, topK, filtros);

    if (resultado.erro) {
      return res.status(400).json({
        error: resultado.erro
      });
    }

    // Retorna resposta estruturada
    return res.status(200).json({
      source: 'rag-v1-mock',
      query: resultado.query,
      resultados: resultado.resultados,
      total: resultado.total,
      tempo_ms: resultado.tempo_ms
    });
  } catch (error) {
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
    const stats = getChunkStats(MOCK_CHUNKS);

    return res.status(200).json({
      source: 'rag-v1-mock',
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
