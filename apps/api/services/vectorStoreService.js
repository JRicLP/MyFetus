/**
 * vectorStoreService.js
 *
 * Comunicação com o Pinecone.
 * Salva vetores e faz busca semântica.
 */

require('dotenv').config();

const { Pinecone } = require('@pinecone-database/pinecone');

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'myfetus-rag';
const PINECONE_NAMESPACE = process.env.PINECONE_NAMESPACE || 'guidelines';
const EMBEDDING_DIMENSION = Number(process.env.EMBEDDING_DIMENSION || 384);

let pineconeClient = null;
let pineconeIndex = null;

function validatePineconeConfig() {
  if (!PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY não configurada no .env.');
  }

  if (!PINECONE_INDEX_NAME) {
    throw new Error('PINECONE_INDEX_NAME não configurado no .env.');
  }
}

function getPineconeClient() {
  validatePineconeConfig();

  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: PINECONE_API_KEY,
    });
  }

  return pineconeClient;
}

function getPineconeIndex() {
  if (!pineconeIndex) {
    const client = getPineconeClient();

    // Nome do index criado no painel do Pinecone.
    pineconeIndex = client.index(PINECONE_INDEX_NAME);
  }

  return pineconeIndex;
}

function getNamespace(namespace = PINECONE_NAMESPACE) {
  const index = getPineconeIndex();

  // Separa os vetores por grupo lógico.
  return index.namespace(namespace);
}

function validateVector(vector) {
  if (!Array.isArray(vector)) {
    throw new Error('Vetor inválido: values precisa ser um array.');
  }

  if (vector.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Dimensão inválida: ${vector.length}. Esperado: ${EMBEDDING_DIMENSION}.`
    );
  }
}

function validatePineconeRecord(record) {
  if (!record || typeof record !== 'object') {
    throw new Error('Registro inválido.');
  }

  if (!record.id) {
    throw new Error('Registro sem id.');
  }

  validateVector(record.values);

  if (!record.metadata || typeof record.metadata !== 'object') {
    throw new Error('Registro sem metadata.');
  }
}

async function upsertVectors(records, namespace = PINECONE_NAMESPACE) {
  if (!Array.isArray(records) || records.length === 0) {
    return { upsertedCount: 0 };
  }

  records.forEach(validatePineconeRecord);

  const namespaceIndex = getNamespace(namespace);

  // Upsert cria ou atualiza vetores com o mesmo id.
  await namespaceIndex.upsert(records);

  return {
    upsertedCount: records.length,
    namespace,
    indexName: PINECONE_INDEX_NAME,
  };
}

async function queryVectors(vector, options = {}) {
  validateVector(vector);

  const {
    namespace = 'guidelines',
    topK = 5,
    includeMetadata = true,
    filter
  } = options;

  const namespaceIndex = getNamespace(namespace);

  return namespaceIndex.query({
    vector,
    topK,
    includeMetadata,
    filter: filter && Object.keys(filter).length > 0 ? filter : undefined
  });
}

async function describeIndexStats() {
  const index = getPineconeIndex();

  return index.describeIndexStats();
}

module.exports = {
  upsertVectors,
  queryVectors,
  describeIndexStats,
  validateVector,
  validatePineconeRecord,
};