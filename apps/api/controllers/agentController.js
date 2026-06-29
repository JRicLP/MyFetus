const client = require('../backend'); // Importação correta usada no seu projeto
const {
  decryptPregnantDetails,
} = require('../services/clinicalDataService');
const ragRetrieval = require('../utils/ragRetrieval');
const { generateMaternalAgentAnalysis } = require('../services/generationService');

const embeddingService = require('../services/embeddingService');
const vectorStore = require('../services/vectorStoreService');

async function handleMaternalAnalysis(req, res) {
  console.log("DEBUG: Variáveis de ambiente no Controller:");
  console.log("DIMENSÃO:", process.env.EMBEDDING_DIMENSION);
  console.log("MODELO:", process.env.EMBEDDING_MODEL);
  
  try {
    const { patientId, query } = req.body;
    
    if (!patientId || !query) {
      return res.status(400).json({ error: 'patientId e query são obrigatórios.' });
    }

    console.log("DEBUG: Procurando gestante com ID:", patientId);
    // 1. Buscar os dados na base de dados (espelhando o fluxo do pregnantController)
    const [rowResult, pregnancyResult, eventsResult] = await Promise.all([
      client.query(
        `SELECT p.*, u.name AS patient_name, u.birthdate
           FROM pregnants p
           JOIN users u ON p.user_id = u.id
          WHERE p.id = $1`,
        [patientId]
      ),
      client.query(
        `SELECT * FROM pregnancies
          WHERE pregnant_id = $1
          ORDER BY created_at DESC LIMIT 1`,
        [patientId]
      ),
      client.query(
        `SELECT pe.*
           FROM pregnancy_events pe
           JOIN pregnancies preg ON preg.id = pe.pregnancy_id
          WHERE preg.pregnant_id = $1
          ORDER BY pe.created_at DESC`,
        [patientId]
      ),
    ]);

    const row = rowResult.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Gestante não encontrada' });
    }

    // 2. Descriptografar usando o serviço do sistema
    const patientData = decryptPregnantDetails(
      row,
      pregnancyResult.rows[0] || null,
      eventsResult.rows
    );

    console.log('Conteúdo do ragRetrieval:', ragRetrieval);

    const queryEmbedding = await embeddingService.generateEmbedding(query);
    const rawPineconeResults = await vectorStore.queryVectors(queryEmbedding, { topK: 10 });

    // 2. Extraia os chunks (o Pinecone retorna 'matches')
    const chunks = rawPineconeResults.matches.map(m => ({
        id: m.id,
        texto: m.metadata.text, // ou o campo onde está o texto
        metadados: m.metadata,
        embedding: m.values
    }));

    // 3. Busca RAG (Diretrizes médicas)
    // const queryEmbedding = await embeddingService.generateEmbedding(query);
    const searchResponse = await ragRetrieval.semanticSearch(query, queryEmbedding, chunks);
    const ragResults = searchResponse.resultados; // ACESSE A PROPRIEDADE AQUI

    // Adicione esta verificação funcional
    if (ragResults.length === 0) {
        console.warn(`Nenhuma diretriz encontrada para a query: ${query}`);
        // Opção A: Retornar um aviso para o usuário
        return res.status(200).json({ 
            success: true, 
            analysis: "Não encontrei diretrizes clínicas específicas para esta questão no momento. Por favor, consulte um profissional de saúde." 
        });
    }

    // 4. Orquestração e Análise via IA
    const analysis = await generateMaternalAgentAnalysis(query, ragResults, patientData);

    // 5. Retorno ao frontend
    return res.status(200).json({
      success: true,
      analysis: analysis,
      metadata: {
        patientId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro na orquestração do Agente Materno:', error);
    return res.status(500).json({ error: 'Erro interno ao processar análise clínica.' });
  }
}

module.exports = { handleMaternalAnalysis };