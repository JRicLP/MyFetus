const assert = require('assert');

const {
  clinicalScenarios,
} = require('../../../scripts/stress_test/scenarios/clinical_scenarios');
const {
  evaluationCriteria,
} = require('../../../scripts/stress_test/scenarios/evaluation_criteria');
const {
  RagClient,
  RagHttpError,
  RagTimeoutError,
} = require('../../../scripts/stress_test/engine/ragClient');
const {
  evaluateRagResponse,
  runScenario,
} = require('../../../scripts/stress_test/engine/scenarioRunner');
const {
  LoadRunner,
  percentile,
} = require('../../../scripts/stress_test/engine/loadRunner');

function mockResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get() {
        return 'application/json';
      },
    },
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

async function testScenarioCatalog() {
  assert.deepStrictEqual(
    clinicalScenarios.map((scenario) => scenario.id),
    ['preeclampsia', 'diabetes_gestacional', 'ciur', 'edge_cases']
  );

  for (const scenario of clinicalScenarios) {
    assert.ok(scenario.nome);
    assert.ok(scenario.descricao);
    assert.ok(Array.isArray(scenario.guideline_alvo));
    assert.ok(Array.isArray(scenario.estagios));

    for (const stage of scenario.estagios) {
      assert.ok(Number.isInteger(stage.estagio));
      assert.ok(Object.prototype.hasOwnProperty.call(stage, 'semana'));
      assert.ok(stage.dados_clinicos && typeof stage.dados_clinicos === 'object');
      assert.ok(Array.isArray(stage.queries));
    }
  }

  const clinicalOnly = clinicalScenarios.filter((scenario) => scenario.id !== 'edge_cases');
  const expectedCriteriaCount = clinicalOnly.reduce(
    (total, scenario) => total + scenario.estagios.length,
    0
  );

  assert.strictEqual(evaluationCriteria.length, expectedCriteriaCount);

  for (const scenario of clinicalOnly) {
    for (const stage of scenario.estagios) {
      assert.ok(evaluationCriteria.some((criteria) => (
        criteria.scenario_id === scenario.id && criteria.estagio === stage.estagio
      )));
    }
  }
}

async function testRagClientRetry() {
  let calls = 0;
  const client = new RagClient({
    token: 'test-token',
    retryDelayMs: 0,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return mockResponse(503, { error: 'temporarily unavailable' });
      return mockResponse(200, { resultados: [], total: 0 });
    },
  });

  const response = await client.query('pré-eclâmpsia', 5);
  assert.strictEqual(calls, 2);
  assert.strictEqual(response.attempts, 2);
  assert.strictEqual(response.status, 200);

  const noRetryClient = new RagClient({
    token: 'test-token',
    fetchImpl: async () => mockResponse(400, { error: 'query inválida' }),
  });

  await assert.rejects(
    () => noRetryClient.query('', 5),
    (error) => error instanceof RagHttpError && error.status === 400 && error.attempts === 1
  );
}

async function testRagClientTimeout() {
  const client = new RagClient({
    token: 'test-token',
    timeoutMs: 10,
    fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }),
  });

  await assert.rejects(
    () => client.query('teste', 5),
    (error) => error instanceof RagTimeoutError && error.timeoutMs === 10
  );
}

async function testScenarioRunnerContinuesAfterFailure() {
  let calls = 0;
  const fakeClient = {
    async query() {
      calls += 1;
      if (calls === 1) throw new Error('falha simulada');

      return {
        status: 200,
        attempts: 1,
        latencyMs: 25,
        data: {
          resultados: [{
            trecho: 'Pressão arterial e proteinúria devem ser avaliadas.',
            fonte: 'FEBRASGO',
            relevancia: 0.9,
          }],
        },
      };
    },
  };

  const scenario = {
    id: 'preeclampsia',
    nome: 'Teste',
    guideline_alvo: ['FEBRASGO'],
    estagios: [{
      estagio: 1,
      nome: 'Estágio',
      semana: 20,
      dados_clinicos: {},
      queries: ['query 1', 'query 2'],
    }],
  };

  const report = await runScenario(scenario, fakeClient);
  assert.strictEqual(calls, 2);
  assert.strictEqual(report.queries_executadas, 2);
  assert.strictEqual(report.estagios[0].resultados[0].success, false);
  assert.strictEqual(report.estagios[0].resultados[1].success, true);
}

async function testEvaluationAndLoadMetrics() {
  const evaluation = evaluateRagResponse({
    resultados: [{
      trecho: 'Controle da pressão arterial, avaliação da proteinúria e monitorização.',
      fonte: 'FEBRASGO',
      relevancia: 0.82,
    }],
  }, 200, {
    fontes_esperadas: ['FEBRASGO'],
    termos_obrigatorios: ['pressão arterial', 'proteinúria'],
    relevancia_minima: 0.65,
    latencia_maxima_ms: 3000,
  });

  assert.strictEqual(evaluation.approved, true);
  assert.strictEqual(percentile([10, 20, 30, 40, 50], 50), 30);
  assert.strictEqual(percentile([10, 20, 30, 40, 50], 95), 50);
  assert.strictEqual(percentile([10, 20, 30, 40, 50], 99), 50);

  let active = 0;
  let maxActive = 0;
  const fakeClient = {
    async query() {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;

      return {
        status: 200,
        latencyMs: 5,
        data: {
          resultados: [{ relevancia: 0.75 }],
        },
      };
    },
  };

  const runner = new LoadRunner({
    ragClient: fakeClient,
    sleepImpl: async () => {},
  });

  const sequentialReport = await runner.run(['q1', 'q2'], { mode: 'sequential' });
  assert.strictEqual(sequentialReport.total_requests, 2);

  const burstReport = await runner.run(['q1'], {
    mode: 'burst',
    concurrency: 3,
  });
  assert.strictEqual(burstReport.total_requests, 3);

  const rampReport = await runner.run(['q1'], {
    mode: 'ramp',
    rampLevels: [1, 2],
  });
  assert.strictEqual(rampReport.total_requests, 3);

  maxActive = 0;

  const report = await runner.run(['query'], {
    mode: 'sustained',
    requestsPerSecond: 6,
    durationSeconds: 1,
    maxConcurrency: 2,
  });

  assert.strictEqual(report.total_requests, 6);
  assert.ok(maxActive <= 2);
  assert.strictEqual(report.failed_requests, 0);
}

async function main() {
  await testScenarioCatalog();
  await testRagClientRetry();
  await testRagClientTimeout();
  await testScenarioRunnerContinuesAfterFailure();
  await testEvaluationAndLoadMetrics();
  console.log('OK: cenários e engine do simulador validados sem servidor real.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
