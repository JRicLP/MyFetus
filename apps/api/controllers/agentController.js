/**
 * agentController.js
 * Orquestra a análise clínica maternal unindo dados da paciente, RAG e IA.
 */

const clinicalDataService = require('../services/clinicalDataService');
const ragRetrieval = require('../utils/ragRetrieval');
const { generateMaternalAgentAnalysis } = require('../services/generationService');

async function handleMaternalAnalysis(req, res) {
  try {
    const { patientId, query } = req.body;
    
    if (!patientId || !query) {
      return res.status(400).json({ error: 'patientId e query são obrigatórios.' });
    }

    // 1. Buscar e Descriptografar dados da paciente
    // Nota: Dependendo da implementação, você pode precisar passar o token ou sessão do usuário
    const patientData = await clinicalDataService.decryptPregnantDetails(patientId);

    // 2. Busca RAG (Diretrizes médicas)
    // O ragRetrieval.search busca os trechos relevantes baseado na pergunta (query)
    const ragResults = await ragRetrieval.search(query);

    // 3. Orquestração e Análise via IA
    const analysis = await generateMaternalAgentAnalysis(query, ragResults, patientData);

    // 4. Retorno ao frontend
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