require('dotenv').config();
const assert = require('assert');

const { RagClient } = require('../../../scripts/stress_test/engine/ragClient');
const { runScenario } = require('../../../scripts/stress_test/engine/scenarioRunner');

const integrationEnabled = process.env.RUN_STRESS_INTEGRATION === '1'
  || process.argv.includes('--integration')
  || process.argv.includes('@integration');

async function main() {
  if (!integrationEnabled) {
    console.log('SKIP @integration: defina RUN_STRESS_INTEGRATION=1 para executar contra o servidor real.');
    return;
  }

  const client = new RagClient({
    baseUrl: process.env.RAG_BASE_URL || 'http://localhost:3000',
    token: process.env.RAG_TEST_JWT || process.env.JWT_TEST_TOKEN,
    timeoutMs: Number(process.env.RAG_TIMEOUT_MS || 5000),
  });

  const scenario = {
    id: 'preeclampsia',
    nome: '@integration - pre-eclampsia simplificada',
    guideline_alvo: ['FEBRASGO', 'ACOG'],
    estagios: [{
      estagio: 1,
      nome: 'Suspeita inicial',
      semana: 20,
      dados_clinicos: {
        pressao_arterial: '140/90 mmHg',
      },
      queries: [
        'Gestante com 20 semanas e PA 140/90: como avaliar suspeita de pre-eclampsia?',
        'Quais exames solicitar diante de hipertensao apos 20 semanas de gestacao?',
      ],
    }],
  };

  const report = await runScenario(scenario, client, { topK: 5 });

  console.log('\n--- BOLETIM DA IA ---');
  report.estagios[0].resultados.forEach((r, i) => {
    console.log(`\nPergunta ${i + 1}: ${r.query}`);
    console.log(`Aprovada? ${r.evaluation.approved}`);
    console.log(`Relevância Máxima: ${r.evaluation.max_relevance.toFixed(4)}`);
    console.log(`Latência (ms): ${r.latency_ms}`);
    console.log(`Passou no Tempo? ${r.evaluation.latency_within_limit}`);
    console.log(`Fontes Encontradas:`, r.evaluation.sources_found);
    console.log(`🚨 Termos Faltando:`, r.evaluation.terms_missing);
  });
  console.log('---------------------\n');

  const falhas = report.estagios[0].resultados.filter(r => !r.success);
  if (falhas.length > 0) console.dir(falhas.map(f => f.error), { depth: null });

  assert.strictEqual(report.estagios_executados, 1);
  assert.strictEqual(report.queries_executadas, 2);
  assert.ok(report.estagios[0].latencia_max_ms > 0);
  assert.ok(report.estagios[0].resultados.every((result) => result.success));

  console.log('OK @integration: simulador executou contra o endpoint RAG real.');
  console.log(`Aprovacao clinica: ${(report.taxa_aprovacao * 100).toFixed(1)}%`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
