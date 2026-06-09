#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    input: null,
    output: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--input') {
      args.input = next;
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

  if (!args.help && !args.input) {
    throw new Error('Informe --input <arquivo-json>.');
  }

  return args;
}

function printHelp() {
  console.log(`Gerador de Relatorio de Estresse - MyFetus RAG

Uso:
  node scripts/stress_test/generate_stress_report.js --input reports/stress.json --output reports/stress_report.md
`);
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toFixed(digits);
}

function percentile(values, percent) {
  const sorted = values
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (!sorted.length) return 0;

  const rank = Math.max(1, Math.ceil((percent / 100) * sorted.length));
  return sorted[Math.min(rank - 1, sorted.length - 1)];
}

function collectScenarioResults(report) {
  return (report.scenarios || []).flatMap((scenario) => (
    scenario.estagios.flatMap((stage) => (
      stage.resultados.map((result) => ({
        scenario,
        stage,
        result,
      }))
    ))
  ));
}

function collectLoadResults(report) {
  return (report.load_tests || []).flatMap((loadTest) => (
    (loadTest.report.results || []).map((result) => ({
      loadTest,
      result,
    }))
  ));
}

function buildExecutiveSummary(report) {
  const scenarioResults = collectScenarioResults(report);
  const loadResults = collectLoadResults(report);
  const totalQueries = scenarioResults.length || loadResults.length || report.summary?.total_queries || 0;
  const approvedQueries = scenarioResults.length
    ? scenarioResults.filter(({ result }) => result.approved).length
    : loadResults.filter(({ result }) => result.success).length;
  const latencies = scenarioResults.length
    ? scenarioResults.map(({ result }) => result.latency_ms)
    : loadResults.map(({ result }) => result.latency_ms);

  return {
    totalQueries,
    approvedQueries,
    approvalRate: totalQueries ? approvedQueries / totalQueries : 0,
    p95: percentile(latencies, 95),
  };
}

function buildScenarioTables(report) {
  if (!report.scenarios?.length) {
    return 'Nenhum resultado sequencial de cenario foi registrado.\n';
  }

  return report.scenarios.map((scenario) => {
    const rows = scenario.estagios.map((stage) => (
      `| ${stage.estagio} | ${stage.nome_estagio} | ${stage.semana_gestacional ?? 'N/A'} | ${stage.queries_aprovadas}/${stage.queries_executadas} | ${formatPercent(stage.taxa_aprovacao)} | ${stage.latencia_media_ms}ms | ${stage.latencia_max_ms}ms |`
    ));

    return `### ${scenario.nome}

| Estagio | Nome | Semana | Aprovadas | Taxa | Latencia media | Latencia max |
|---|---|---:|---:|---:|---:|---:|
${rows.join('\n')}
`;
  }).join('\n');
}

function summarizeValue(value) {
  if (value == null) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

function buildFailureSection(report) {
  const scenarioFailures = collectScenarioResults(report).filter(({ result }) => !result.approved);
  const loadFailures = collectLoadResults(report).filter(({ result }) => !result.success);

  if (!scenarioFailures.length && !loadFailures.length) {
    return 'Nenhuma falha registrada.\n';
  }

  const scenarioLines = scenarioFailures.map(({ scenario, stage, result }) => {
    const expected = stage.criteria
      ? `fontes ${stage.criteria.fontes_esperadas.join(', ')}; termos ${stage.criteria.termos_obrigatorios.join(', ')}`
      : 'sem criterio clinico especifico';
    const received = result.success
      ? summarizeValue((result.rag_response?.resultados || []).slice(0, 2))
      : result.error?.message;

    return `- ${scenario.nome}, estagio ${stage.estagio}: "${summarizeValue(result.query)}" | esperado: ${expected} | recebido: ${received}`;
  });

  const loadLines = loadFailures.map(({ loadTest, result }) => (
    `- ${loadTest.nome}, modo ${loadTest.report.mode}: "${summarizeValue(result.query)}" | erro: ${result.error?.message || 'falha sem mensagem'}`
  ));

  return [...scenarioLines, ...loadLines].join('\n');
}

function buildEdgeCaseSection(report) {
  const edgeScenario = (report.scenarios || []).find((scenario) => scenario.scenario_id === 'edge_cases');
  const edgeLoad = (report.load_tests || []).find((loadTest) => loadTest.scenario_id === 'edge_cases');

  if (!edgeScenario && !edgeLoad) {
    return 'Edge cases nao foram executados neste arquivo.\n';
  }

  if (edgeScenario) {
    return edgeScenario.estagios.map((stage) => (
      `- Estagio ${stage.estagio} (${stage.nome_estagio}): ${stage.queries_aprovadas}/${stage.queries_executadas} aprovadas, latencia max ${stage.latencia_max_ms}ms`
    )).join('\n');
  }

  return `- Modo ${edgeLoad.report.mode}: ${edgeLoad.report.successful_requests}/${edgeLoad.report.total_requests} sucesso, erro ${formatPercent(edgeLoad.report.error_rate)}, p95 ${edgeLoad.report.latency_ms.p95}ms`;
}

function buildRecommendations(report) {
  const recommendations = [];
  const summary = buildExecutiveSummary(report);
  const loadReports = report.load_tests || [];

  if (summary.approvalRate < 0.8) {
    recommendations.push('Revisar criterios, chunks indexados e fontes esperadas: taxa de aprovacao abaixo de 80%.');
  }

  if (summary.p95 > 3000) {
    recommendations.push('Latencia p95 acima de 3s: considerar cache de embeddings de queries frequentes e revisar gargalos do Pinecone.');
  }

  for (const item of loadReports) {
    if (item.report.latency_ms.p99 > 3000) {
      recommendations.push(`Latencia p99 acima de 3s no modo ${item.report.mode} em ${item.nome}: reduzir concorrencia em desenvolvimento ou otimizar recuperacao.`);
    }

    if (item.report.error_rate > 0.05) {
      recommendations.push(`Taxa de erro acima de 5% no modo ${item.report.mode} em ${item.nome}: investigar timeouts, 5xx e limites do backend.`);
    }

    if (item.report.relevance_degradation > 0.2) {
      recommendations.push(`Degradacao de relevancia acima de 20% em ${item.nome}: comparar baseline sequencial com carga e validar estabilidade da busca.`);
    }
  }

  if (!recommendations.length) {
    recommendations.push('Nenhuma recomendacao critica automatica foi acionada pelos thresholds padrao.');
  }

  return recommendations.map((item) => `- ${item}`).join('\n');
}

function buildMarkdown(report) {
  const summary = buildExecutiveSummary(report);

  return `# Relatorio de Estresse - MyFetus RAG

Gerado em: ${report.generated_at || new Date().toISOString()}

## Resumo executivo

- Total de queries: ${summary.totalQueries}
- Queries aprovadas/sucesso: ${summary.approvedQueries}
- Taxa de aprovacao global: ${formatPercent(summary.approvalRate)}
- Latencia p95: ${summary.p95}ms
- Modo: ${report.config?.mode || 'N/A'}

## Resultados por cenario

${buildScenarioTables(report)}

## Queries que falharam

${buildFailureSection(report)}

## Analise de edge cases

${buildEdgeCaseSection(report)}

## Recomendacoes automaticas

${buildRecommendations(report)}
`;
}

function readJson(inputPath) {
  const resolved = path.resolve(process.cwd(), inputPath);
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function writeMarkdown(outputPath, markdown) {
  const resolved = path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, markdown);
  return resolved;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const report = readJson(args.input);
  const markdown = buildMarkdown(report);

  if (args.output) {
    const writtenPath = writeMarkdown(args.output, markdown);
    console.log(`Relatorio markdown gerado em: ${writtenPath}`);
    return;
  }

  console.log(markdown);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  buildMarkdown,
  buildRecommendations,
  buildExecutiveSummary,
};
