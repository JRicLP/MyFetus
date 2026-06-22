/**
 * rag.types.js
 * 
 * Contrato de tipos para o sistema RAG (Retrieval-Augmented Generation)
 * Define schema de chunks, respostas e configurações de busca
 */

/**
 * @typedef {Object} ChunkMetadata
 * @property {string} fonte - Fonte do documento (ex: FEBRASGO, ACOG)
 * @property {string} especialidade - Área clínica (ex: Obstetrícia)
 * @property {string} tema - Tema principal (ex: Pré-eclâmpsia)
 * @property {string} seção - Número da seção do documento
 * @property {string} tipo - Tipo de conteúdo (recomendação, definição, protocolo)
 */

/**
 * @typedef {Object} Chunk
 * @property {string} id - Identificador único do chunk
 * @property {string} texto - Conteúdo textual do chunk
 * @property {number[]} embedding - Vetor de embedding (dimensão 1536 para OpenAI)
 * @property {ChunkMetadata} metadados - Metadados clínicos do chunk
 */

/**
 * @typedef {Object} SearchResult
 * @property {string} trecho - Texto do resultado
 * @property {string} fonte - Fonte do documento
 * @property {string} especialidade - Especialidade clínica
 * @property {string} tema - Tema do chunk
 * @property {number} relevancia - Score de relevância (0-1)
 * @property {string} documento_id - ID do documento original
 */

/**
 * @typedef {Object} SearchResponse
 * @property {string} query - Consulta original
 * @property {SearchResult[]} resultados - Resultados ordenados por relevância
 * @property {number} total - Total de resultados encontrados
 * @property {number} tempo_ms - Tempo de execução em ms
 */

module.exports = {
  // Tipos exportados para documentação
};
