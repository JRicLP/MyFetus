require('dotenv').config();

const { Pinecone } = require('@pinecone-database/pinecone');

let pineconeClient = null;
let pineconeIndex = null;

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }

  return value;
}

function getPineconeClient() {
  if (pineconeClient) {
    return pineconeClient;
  }

  const apiKey = getRequiredEnv('PINECONE_API_KEY');
  pineconeClient = new Pinecone({ apiKey });

  return pineconeClient;
}

async function getPineconeIndex() {
  if (pineconeIndex) {
    return pineconeIndex;
  }

  const indexName = getRequiredEnv('PINECONE_INDEX_NAME');
  const client = getPineconeClient();

  pineconeIndex = client.index(indexName);

  return pineconeIndex;
}

function resetPineconeClientForTests() {
  pineconeClient = null;
  pineconeIndex = null;
}

module.exports = {
  getPineconeClient,
  getPineconeIndex,
  resetPineconeClientForTests,
};
