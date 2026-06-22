/**
 * generationService.js
 *
 * Etapa de geração do RAG: recebe a pergunta da paciente e os trechos
 * recuperados pela busca semântica (vectorStoreService) e usa o Gemini
 * para escrever a resposta final em linguagem natural.
 */

require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `Você é o assistente clínico do MyFetus, um app de acompanhamento de gestação.
Responda em português do Brasil, de forma clara, breve e acolhedora.
Baseie a resposta SOMENTE nos trechos de diretrizes fornecidos no contexto.
Se o contexto não tiver a resposta, diga que não encontrou essa informação nas diretrizes disponíveis e recomende falar com o médico responsável.
Nunca dê diagnóstico. Deixe claro que isso não substitui uma consulta médica.`;

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

function buildContext(trechos) {
  return trechos
    .map((trecho, index) => `[${index + 1}] Fonte: ${trecho.fonte}\n${trecho.trecho}`)
    .join('\n\n');
}

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

module.exports = {
  generateAnswer,
};
