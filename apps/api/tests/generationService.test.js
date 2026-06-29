/**
 * Testes Unitários para o generationService.js
 * Versão Nativa do Node.js (usando node:test e node:assert)
 */
const test = require('node:test');
const assert = require('node:assert');
const Module = require('node:module');

// 1. MOCK DO AMBIENTE (Crucial: DEVE ser definido ANTES do require do serviço)
process.env.GEMINI_API_KEY = 'fake-test-key-123';

// 2. Configuração do Mock Nativo da função de geração (Impede chamadas reais à API)
const mockGenerateContent = test.mock.fn(async () => ({
  text: 'Análise estruturada do Agente Materno concluída. Lembre-se: o diagnóstico final é do médico humano.',
}));

// 3. Interceptação do 'require' para simular o SDK do Google nativamente
const originalRequire = Module.prototype.require;
Module.prototype.require = function(request) {
  if (request === '@google/genai') {
    return {
      GoogleGenAI: class {
        constructor() {
          this.models = { generateContent: mockGenerateContent };
        }
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

// 4. Importação do serviço (Agora ele lerá a chave falsa definida no passo 1)
const { generateMaternalAgentAnalysis, generateAnswer } = require('../services/generationService');

// 5. Suíte de Testes
test.describe('Generation Service - Agente Materno', () => {

  test.beforeEach(() => {
    // Reseta o contador de chamadas do mock antes de cada teste
    mockGenerateContent.mock.resetCalls();
    process.env.GEMINI_API_KEY = 'fake-test-key-123';
  });

  test.it('deve formatar corretamente o contexto do paciente e das diretrizes e chamar a IA', async () => {
    const query = 'A paciente relata dores de cabeça intensas. O que indicam as diretrizes?';
    
    const trechosRAG = [
      { fonte: 'FEBRASGO', relevancia: 0.95, trecho: 'Dores de cabeça intensas após 20 semanas podem indicar pré-eclâmpsia.' }
    ];
    
    const dadosPaciente = {
      birthdate: '1990-05-15',
      latest_pregnancy: { weeks: 32 },
      all_events: [
        { data_evento: '2026-05-01', tipo_evento: 'Consulta', descricao: 'Pressão levemente alterada' }
      ]
    };

    const result = await generateMaternalAgentAnalysis(query, trechosRAG, dadosPaciente);

    // Valida se retornou o texto mockado
    assert.match(result, /Análise estruturada/);
    
    // Valida se o LLM foi chamado exatemente 1 vez
    assert.strictEqual(mockGenerateContent.mock.calls.length, 1);

    const callArgs = mockGenerateContent.mock.calls[0].arguments[0];

    // Validações Críticas de Segurança e Prompt
    assert.strictEqual(callArgs.config.temperature, 0.2, 'A temperatura deve ser 0.2 para evitar alucinações');
    assert.match(callArgs.config.systemInstruction, /Você é o Agente Materno do MyFetus/);
    assert.match(callArgs.config.systemInstruction, /NÃO DEVE, sob nenhuma circunstância, emitir diagnósticos/);

    // Valida se os dados foram injetados corretamente
    assert.match(callArgs.contents, /Idade Gestacional Atual: 32 semanas/);
    assert.match(callArgs.contents, /Pressão levemente alterada/);
    assert.match(callArgs.contents, /FEBRASGO/);
  });

  test.it('deve lidar graciosamente com dados de paciente nulos ou incompletos', async () => {
    await generateMaternalAgentAnalysis('Qual a conduta para diabetes gestacional?', [], null);
    
    const callArgs = mockGenerateContent.mock.calls[0].arguments[0];

    // Valida uso de mensagens de fallback
    assert.match(callArgs.contents, /Nenhum dado clínico fornecido/);
    assert.match(callArgs.contents, /Nenhuma diretriz médica específica/);
  });

  test.it('deve lançar um erro se a API do Gemini falhar', async () => {
    // Silencia o console.error temporariamente para não poluir o output do teste
    const originalConsoleError = console.error;
    console.error = test.mock.fn();

    // Força o mock a retornar um erro neste teste específico
    mockGenerateContent.mock.mockImplementationOnce(async () => {
      throw new Error('API Inacessível');
    });

    await assert.rejects(
      generateMaternalAgentAnalysis('Teste', [], {}),
      /Falha ao comunicar com o LLM para análise clínica./
    );

    // Restaura o console.error
    console.error = originalConsoleError;
  });

  test.it('deve lançar erro se a GEMINI_API_KEY não estiver configurada', async () => {
    delete process.env.GEMINI_API_KEY;
    
    // Limpa o cache do require para forçar a re-inicialização do módulo e verificação do env vazio
    delete require.cache[require.resolve('../services/generationService')];
    const freshGenerationService = require('../services/generationService');
    
    // Passamos um array com 1 item (em vez de vazio) para passar pelo "early return" e forçar a checagem da chave
    await assert.rejects(
      freshGenerationService.generateAnswer('Teste', [{ fonte: 'Dummy', trecho: 'Dummy' }]),
      /GEMINI_API_KEY não configurada no \.env\./
    );

    // Restaura a chave para não quebrar outras execuções
    process.env.GEMINI_API_KEY = 'fake-test-key-123';
  });

});