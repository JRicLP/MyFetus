#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const {
  clinicalScenarios,
  getClinicalScenario,
} = require('./scenarios/clinical_scenarios');
const { RagClient } = require('./engine/ragClient');
const { runScenario } = require('./engine/scenarioRunner');
const { LoadRunner } = require('./engine/loadRunner');

const VALID_MODES = new Set(['sequential', 'burst', 'ramp', 'sustained']);

function parseArgs(argv) {
  const args = {
    all: false,
    scenario: null,
    mode: 'sequential',
    topK: 5,
    timeoutMs: Number(process.env.RAG_TIMEOUT_MS || 5000),
    concurrency: 5,
    requestsPerSecond: 5,
    durationSeconds: 10,
    output: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--all') {
      args.all = true;
    } else if (arg === '--scenario') {
      args.scenario = next;
      index += 1;
    } else if (arg === '--mode') {
      args.mode = next;
      index += 1;
    } else if (arg === '--topK') {
      args.topK = Number(next);
      index += 1;
    } else if (arg === '--timeout') {
      args.timeoutMs = Number(next);
      index += 1;
    } else if (arg === '--concurrency') {
      args.concurrency = Number(next);
      index += 1;
    } else if (arg === '--rps') {
      args.requestsPerSecond = Number(next);
      index += 1;
    } else if (arg === '--duration') {
      args.durationSeconds = Number(next);
      index += 1;
    } else if (arg === '--output') {
      args.output = next;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Flag desconhecida: ${arg}`);
    }
  }

  if (!args.help && !args.all && !args.scenario) {
    throw new Error('Informe --scenario <id> ou --all.');
  }

  if (!VALID_MODES.has(args.mode)) {
    throw new Error(`Modo inválido: ${args.mode}. Use: ${Array.from(VALID_MODES).join(', ')}.`);
  }

  return args;
}

function printHelp() {
  console.log(`Simulador de Casos Criticos - MyFetus RAG

Uso:
  node scripts/stress_test/run_stress_test.js --scenario preeclampsia
  node scripts/stress_test/run_stress_test.js --all
  node scripts/stress_test/run_stress_test.js --scenario edge_cases
  node scripts/stress_test/run_stress_test.js --scenario preeclampsia --mode burst --concurrency 10
  node scripts/stress_test/run_stress_test.js --all --mode ramp
  node scripts/stress_test/run_stress_test.js --all --output reports/stress_<timestamp>.json

Flags:
  --scenario <id>       preeclampsia | diabetes_gestacional | ciur | edge_cases
  --all                 executa todos os cenarios
  --mode <modo>         sequential | burst | ramp | sustained
  --topK <n>            quantidade de resultados do RAG (padrao: 5)
  --timeout <ms>        timeout por chamada (padrao: RAG_TIMEOUT_MS ou 5000)
  --concurrency <n>     concorrencia para burst/ramp/sustained (padrao: 5)
  --rps <n>             requests por segundo no sustained (padrao: 5)
  --duration <s>        duracao em segundos no sustained (padrao: 10)
  --output <arquivo>    salva o relatorio JSON
`);
}

function selectScenarios(args) {
  if (args.all) return clinicalScenarios;

  const scenario = getClinicalScenario(args.scenario);
  if (!scenario) {
    throw new Error(`Cenario nao encontrado: ${args.scenario}`);
  }

  return [scenario];
}

function getScenarioQueries(scenario) {
  return scenario.estagios.flatMap((stage) => stage.queries);
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toFixed(digits);
}

function printHeader(scenarios, args) {
  const scenarioLabel = args.all
    ? `Todos (${scenarios.length} cenarios)`
    : `${scenarios[0].nome} (${scenarios[0].estagios.length} estagios)`;

  console.log('Simulador de Casos Criticos - MyFetus RAG');
  console.log('--------------------------------------------');
  console.log(`Cenario: ${scenarioLabel}`);
  console.log(`Modo: ${args.mode} | topK: ${args.topK} | timeout: ${args.timeoutMs}ms`);
  console.log('');
}

function printScenarioStage(stageReport) {
  const week = stageReport.semana_gestacional == null
    ? 'semana N/A'
    : `semana ${stageReport.semana_gestacional}`;

  console.log(`[Estagio ${stageReport.estagio} - ${week}] ${stageReport.nome_estagio}`);

  stageReport.resultados.forEach((result, index) => {
    const marker = result.approved ? 'OK' : 'FAIL';
    const relevance = result.evaluation?.max_relevance ?? 0;
    const sources = result.evaluation?.sources_found?.length
      ? result.evaluation.sources_found.join(', ')
      : 'nao encontrado';

    console.log(
      `  ${marker} Query ${index + 1} | latencia: ${result.latency_ms}ms | relevancia: ${formatNumber(relevance, 2)} | fontes: ${sources}`
    );

    if (!result.success) {
      console.log(`    erro: ${result.error?.code || result.error?.name} - ${result.error?.message}`);
    } else if (result.evaluation?.terms_missing?.length) {
      console.log(`    termos ausentes: ${result.evaluation.terms_missing.join(', ')}`);
    }
  });

  console.log(
    `  Estagio: ${stageReport.queries_aprovadas}/${stageReport.queries_executadas} aprovadas (${formatPercent(stageReport.taxa_aprovacao)}) | latencia media: ${stageReport.latencia_media_ms}ms`
  );
  console.log('');
}

function printScenarioReport(report) {
  console.log(`Cenario: ${report.nome}`);
  report.estagios.forEach(printScenarioStage);
  console.log(
    `Resultado do cenario: ${report.queries_aprovadas}/${report.queries_executadas} aprovadas (${formatPercent(report.taxa_aprovacao)})`
  );
  console.log('');
}

function printLoadReport(scenario, report) {
  console.log(`Cenario: ${scenario.nome}`);
  console.log(
    `  Modo ${report.mode}: ${report.successful_requests}/${report.total_requests} sucesso | erro: ${formatPercent(report.error_rate)} | throughput: ${formatNumber(report.throughput_qps, 2)} qps`
  );
  console.log(
    `  Latencia: p50 ${report.latency_ms.p50}ms | p95 ${report.latency_ms.p95}ms | p99 ${report.latency_ms.p99}ms | max ${report.latency_ms.max}ms`
  );
  console.log(`  Relevancia media: ${formatNumber(report.average_relevance, 3)}`);
  console.log('');
}

async function runSequentialScenarios(scenarios, client, args) {
  const reports = [];

  for (const scenario of scenarios) {
    const report = await runScenario(scenario, client, {
      topK: args.topK,
    });

    reports.push(report);
    printScenarioReport(report);
  }

  return reports;
}

async function runLoadScenarios(scenarios, client, args) {
  const runner = new LoadRunner({ ragClient: client });
  const reports = [];

  for (const scenario of scenarios) {
    const queries = getScenarioQueries(scenario);
    const report = await runner.run(queries, {
      mode: args.mode,
      topK: args.topK,
      concurrency: args.concurrency,
      rampLevels: [1, 5, 10, args.concurrency].filter((value, index, values) => (
        Number.isFinite(value) && value > 0 && values.indexOf(value) === index
      )),
      requestsPerSecond: args.requestsPerSecond,
      durationSeconds: args.durationSeconds,
      maxConcurrency: args.concurrency,
    });

    reports.push({
      scenario_id: scenario.id,
      nome: scenario.nome,
      report,
    });
    printLoadReport(scenario, report);
  }

  return reports;
}

function buildSummary(report) {
  const scenarioReports = report.scenarios || [];
  const loadReports = report.load_tests || [];

  if (scenarioReports.length) {
    const totalQueries = scenarioReports.reduce((sum, scenario) => sum + scenario.queries_executadas, 0);
    const totalApproved = scenarioReports.reduce((sum, scenario) => sum + scenario.queries_aprovadas, 0);
    const latencies = scenarioReports.flatMap((scenario) => (
      scenario.estagios.flatMap((stage) => stage.resultados.map((result) => result.latency_ms))
    ));

    return {
      total_queries: totalQueries,
      approved_queries: totalApproved,
      approval_rate: totalQueries ? totalApproved / totalQueries : 0,
      max_latency_ms: latencies.length ? Math.max(...latencies) : 0,
      failed: totalApproved < totalQueries,
    };
  }

  const totalRequests = loadReports.reduce((sum, item) => sum + item.report.total_requests, 0);
  const failedRequests = loadReports.reduce((sum, item) => sum + item.report.failed_requests, 0);
  const maxP95 = loadReports.reduce((max, item) => Math.max(max, item.report.latency_ms.p95), 0);

  return {
    total_queries: totalRequests,
    approved_queries: totalRequests - failedRequests,
    approval_rate: totalRequests ? (totalRequests - failedRequests) / totalRequests : 0,
    max_latency_ms: maxP95,
    failed: failedRequests > 0 || maxP95 > report.config.timeoutMs,
  };
}

function writeJsonReport(outputPath, report) {
  const resolved = path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`);
  return resolved;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const scenarios = selectScenarios(args);
  printHeader(scenarios, args);

  const client = new RagClient({
    timeoutMs: args.timeoutMs,
  });

  const report = {
    generated_at: new Date().toISOString(),
    config: args,
    scenarios: [],
    load_tests: [],
  };

  if (args.mode === 'sequential') {
    report.scenarios = await runSequentialScenarios(scenarios, client, args);
  } else {
    report.load_tests = await runLoadScenarios(scenarios, client, args);
  }

  report.summary = buildSummary(report);

  console.log('Resumo');
  console.log(`  Total: ${report.summary.total_queries} queries`);
  console.log(`  Aprovacao: ${formatPercent(report.summary.approval_rate)}`);
  console.log(`  Maior latencia/p95: ${report.summary.max_latency_ms}ms`);

  if (args.output) {
    const writtenPath = writeJsonReport(args.output, report);
    console.log(`  Relatorio JSON: ${writtenPath}`);
  }

  process.exitCode = report.summary.failed ? 1 : 0;
}

main().catch((error) => {
  console.error(`Erro: ${error.message}`);
  process.exit(1);
});
