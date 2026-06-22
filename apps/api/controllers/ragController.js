/**
 * ragController.js
 * 
 * Controlador para endpoints de RAG (Retrieval-Augmented Generation)
 * Gerencia requisições de busca semântica e consulta ao knowledge base
 */

const vectorStoreService = require('../services/vectorStoreService');
const embeddingService = require('../services/embeddingService');
const generationService = require('../services/generationService');
const { sanitizeForLLM } = require('../utils/piiSanitizer');

/**
 * Busca os trechos mais relevantes no Pinecone para uma query.
 * Usado tanto pelo endpoint de busca pura quanto pelo chat (retrieval + generation).
 */
async function retrieveChunks(query, topK, filtros) {
  // 1. Aplica a regra de negócio do prefixo exigida pelo contrato
  const prefixedQuery = `query: ${query}`;

  // 2. Gera o vetor real com a string prefixada
  const queryEmbedding = await embeddingService.generateEmbedding(prefixedQuery);

  // 3. Consulta o Pinecone no namespace correto
  const pineconeResult = await vectorStoreService.queryVectors(queryEmbedding, {
    namespace: 'guidelines',
    topK,
    filter: filtros && Object.keys(filtros).length > 0 ? filtros : undefined
  });

  // 4. Mapeia a resposta usando estritamente o contrato de metadados
  return pineconeResult.matches.map(match => ({
    trecho: match.metadata.text,
    fonte: match.metadata.source,
    pagina: match.metadata.page,
    secao: match.metadata.section,
    relevancia: Number(match.score.toFixed(4)),
    documento_id: match.metadata.documentId
  }));
}

function validateSearchInput(query, topK) {
  if (!query || typeof query !== 'string') {
    return 'query é obrigatória e deve ser uma string';
  }

  if (query.trim().length === 0) {
    return 'query não pode estar vazia';
  }

  if (!Number.isInteger(topK) || topK < 1 || topK > 20) {
    return 'topK deve ser um inteiro entre 1 e 20';
  }

  return null;
}

/**
 * Busca semântica no knowledge base
 * Endpoint: POST /api/internal/rag/search
 */
const searchKnowledgeBase = async (req, res) => {
  try {
    const body = req.body || {};
    const query = body.query;
    const topK = body.topK ?? 5;
    const filtros = body.filtros || {};

    const validationError = validateSearchInput(query, topK);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const startTime = Date.now();
    const resultados = await retrieveChunks(query, topK, filtros);

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
 * Chat clínico: busca os trechos relevantes (retrieval) e usa o Gemini
 * para gerar uma resposta em linguagem natural a partir deles (generation).
 * Endpoint: POST /api/internal/rag/chat
 */
const askClinicalChat = async (req, res) => {
  try {
    const body = req.body || {};
    const query = body.query;
    const topK = body.topK ?? 5;

    const validationError = validateSearchInput(query, topK);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const startTime = Date.now();

    // Remove identificadores pessoais antes de mandar a pergunta para o LLM externo.
    const sanitizedQuery = sanitizeForLLM(query);

    const trechos = await retrieveChunks(sanitizedQuery, topK, {});
    const resposta = await generationService.generateAnswer(sanitizedQuery, trechos);

    return res.status(200).json({
      source: 'rag-v2-gemini',
      query: query,
      resposta,
      fontes: trechos.map(trecho => ({
        fonte: trecho.fonte,
        secao: trecho.secao,
        relevancia: trecho.relevancia
      })),
      tempo_ms: Date.now() - startTime
    });
  } catch (error) {
    console.error('Erro ao gerar resposta do chat clínico:', error.message);
    return res.status(500).json({
      error: 'Falha ao gerar resposta do chat clínico',
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
  askClinicalChat,
  getRAGStats
};
