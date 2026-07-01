/**
 * generationService.js
 *
 * Etapa de geração do RAG e do Agente Materno.
 */

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// ============================================================================
// 1. INSTRUÇÕES DE SISTEMA (PROMPTS)
// ============================================================================

// Prompt original (mantido para compatibilidade com o chat simples)
const SYSTEM_INSTRUCTION = `Você é o assistente clínico do MyFetus, um app de acompanhamento de gestação.
Responda em português do Brasil, de forma clara, breve e acolhedora.
Baseie a resposta SOMENTE nos trechos de diretrizes fornecidos no contexto.
Se o contexto não tiver a resposta, diga que não encontrou essa informação nas diretrizes disponíveis e recomende falar com o médico responsável.
Nunca dê diagnóstico. Deixe claro que isso não substitui uma consulta médica.`;

// NOVO: Prompt super-restrito para o Agente Materno (focado no médico)
const AGENTE_MATERNO_INSTRUCTION = `Você é o Agente Materno do MyFetus, um assistente clínico virtual avançado de apoio à decisão médica.
A sua função é cruzar os dados reais do histórico da paciente com as diretrizes médicas oficiais fornecidas via RAG.
Responda de forma estruturada, técnica e profissional, direcionada ao médico assistente.

REGRA DE OURO (RISCO CLÍNICO): 
Você NÃO DEVE, sob nenhuma circunstância, emitir diagnósticos definitivos. O seu papel é analisar os dados, levantar hipóteses clínicas baseadas ESTRITAMENTE nas diretrizes fornecidas e sintetizar informações.
Termine sempre a sua análise reforçando que a decisão clínica e o diagnóstico final cabem exclusivamente ao médico humano responsável.`;


// ============================================================================
// 2. INICIALIZAÇÃO DO CLIENTE GEMINI
// ============================================================================

let client = null;

function getClient() {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurada no .env.');
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return client;
}


// ============================================================================
// 3. FUNÇÕES AUXILIARES DE FORMATAÇÃO DE CONTEXTO
// ============================================================================

// Formata os chunks vindos do RAG
function buildContext(trechos) {
  if (!trechos || trechos.length === 0) return '';
  return trechos
    .map((trecho, index) => `[${index + 1}] Fonte: ${trecho.fonte} (Relevância: ${trecho.relevancia})\n${trecho.trecho}`)
    .join('\n\n');
}

// NOVO: Formata os dados descritografados da paciente para leitura da IA
function buildPatientContext(dadosPaciente) {
  if (!dadosPaciente) return 'Nenhum dado clínico fornecido para esta análise.';

  let context = `--- DADOS DA PACIENTE ---\n`;
  
  // Nota: Idealmente, o nome deve ser mascarado num passo anterior se houver requisitos estritos de privacidade
  context += `Idade/Nascimento: ${dadosPaciente.birthdate || 'Não informado'}\n`;
  
  if (dadosPaciente.latest_pregnancy) {
    context += `Idade Gestacional Atual: ${dadosPaciente.latest_pregnancy.weeks} semanas\n`;
  }

  if (dadosPaciente.all_events && dadosPaciente.all_events.length > 0) {
    context += `\n--- HISTÓRICO CLÍNICO E EVENTOS ---\n`;
    dadosPaciente.all_events.forEach(event => {
      // Usando as chaves prováveis do schema baseadas no clinicalDataService
      const data = event.data_evento ? new Date(event.data_evento).toLocaleDateString('pt-BR') : 'Data Indefinida';
      context += `- [${data}] ${event.tipo_evento || 'Evento'}: ${event.descricao || event.detalhes || 'Sem descrição detalhada'}\n`;
    });
  } else {
    context += `\n--- HISTÓRICO CLÍNICO E EVENTOS ---\nSem registos clínicos anteriores.\n`;
  }

  return context;
}


// ============================================================================
// 4. FUNÇÕES DE GERAÇÃO (LLM)
// ============================================================================

// Função original (mantida)
async function generateAnswer(query, trechos) {
  if (!trechos || trechos.length === 0) {
    return 'Não encontrei informações sobre isso nas diretrizes disponíveis. Recomendo conversar com seu médico sobre essa dúvida.';
  }

  const ai = getClient();
  const contexto = buildContext(trechos);

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `Contexto (trechos de diretrizes clínicas):\n${contexto}\n\nPergunta da paciente: ${query}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

  return response.text || 'Não consegui gerar uma resposta agora. Tente novamente em alguns instantes.';
}

// NOVO: Função central do Agente Materno
async function generateMaternalAgentAnalysis(query, trechosRAG, dadosPaciente) {
  const ai = getClient();
  
  const contextoDiretrizes = buildContext(trechosRAG);
  const contextoPaciente = buildPatientContext(dadosPaciente);

  const finalPrompt = `
Por favor, analise a seguinte solicitação baseando-se no histórico da paciente e nas diretrizes médicas recuperadas.

${contextoPaciente}

--- DIRETRIZES MÉDICAS RECUPERADAS (BASE DE CONHECIMENTO) ---
${contextoDiretrizes || 'Nenhuma diretriz médica específica foi encontrada no sistema para os termos buscados.'}

--- SOLICITAÇÃO / SINTOMA A ANALISAR ---
${query}
  `;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: finalPrompt,
      config: {
        systemInstruction: AGENTE_MATERNO_INSTRUCTION,
        // Temperaturas mais baixas são recomendadas para respostas médicas para reduzir alucinações
        temperature: 0.2, 
      },
    });

    return response.text || 'Não foi possível completar a análise clínica no momento.';
  } catch (error) {
    console.error('Erro na geração do Agente Materno:', error);
    throw new Error('Falha ao comunicar com o LLM para análise clínica.');
  }
}

module.exports = {
  generateAnswer,
  generateMaternalAgentAnalysis, // Exportamos a nova função
};