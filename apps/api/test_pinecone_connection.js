const vectorStore = require('./services/vectorStoreService');
const embedding = require('./services/embeddingService');

async function testConnection() {
  try {
    const query = "cefaleia intensa";
    const queryEmbedding = await embedding.generateEmbedding(query); // Certifique-se que esta função existe
    
    // Tenta buscar diretamente no serviço
    // Altere esta linha no seu test_pinecone_connection.js:
    // const results = await vectorStore.search(queryEmbedding, 5); 

    // Para esta:
    const results = await vectorStore.queryVectors(queryEmbedding, { 
        topK: 5,
        namespace: 'guidelines' // Certifique-se de que este é o namespace onde os dados foram inseridos
    });
    
    console.log("Resultados brutos do Pinecone:", results);
  } catch (err) {
    console.error("Erro na busca direta no Pinecone:", err);
  }
  process.exit();
}

testConnection();