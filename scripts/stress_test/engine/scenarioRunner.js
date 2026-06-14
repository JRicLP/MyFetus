const { getEvaluationCriteria } = require('../scenarios/evaluation_criteria');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function evaluateRagResponse(responseData, latencyMs, criteria) {
  const results = Array.isArray(responseData?.resultados) ? responseData.resultados : [];
  const combinedText = normalizeText(results.map((result) => result.trecho).join(' '));
  const resultSources = results.map((result) => normalizeText(result.fonte));
  const relevanceScores = results
    .map((result) => Number(result.relevancia))
    .filter(Number.isFinite);

  if (!criteria) {
    return {
      approved: true,
      source_hit_rate: null,
      required_terms_hit_rate: null,
      max_relevance: relevanceScores.length ? Math.max(...relevanceScores) : 0,
      latency_within_limit: null,
      sources_found: results.map((result) => result.fonte).filter(Boolean),
      terms_found: [],
      terms_missing: [],
    };
  }

  const expectedSources = criteria.fontes_esperadas || [];
  const requiredTerms = criteria.termos_obrigatorios || [];
  const sourcesFound = expectedSources.filter((source) => {
    const normalizedSource = normalizeText(source);
    return resultSources.some((resultSource) => resultSource.includes(normalizedSource));
  });
  const termsFound = requiredTerms.filter((term) => combinedText.includes(normalizeText(term)));
  const maxRelevance = relevanceScores.length ? Math.max(...relevanceScores) : 0;
  const sourceHitRate = expectedSources.length ? sourcesFound.length / expectedSources.length : 1;
  const termHitRate = requiredTerms.length ? termsFound.length / requiredTerms.length : 1;
  const latencyWithinLimit = latencyMs <= criteria.latencia_maxima_ms;

  return {
    approved: (
      sourceHitRate > 0
      && termHitRate === 1
      && maxRelevance >= criteria.relevancia_minima
      && latencyWithinLimit
    ),
    source_hit_rate: sourceHitRate,
    required_terms_hit_rate: termHitRate,
    max_relevance: maxRelevance,
    latency_within_limit: latencyWithinLimit,
    sources_found: sourcesFound,
    terms_found: termsFound,
    terms_missing: requiredTerms.filter((term) => !termsFound.includes(term)),
  };
}

async function executeStage(scenario, stage, ragClient, { topK = 5 } = {}) {
  const criteria = getEvaluationCriteria(scenario.id, stage.estagio);
  const results = [];

  for (const query of stage.queries) {
    try {
      const response = await ragClient.query(query, topK);
      const evaluation = evaluateRagResponse(response.data, response.latencyMs, criteria);

      results.push({
        query,
        success: true,
        status: response.status,
        attempts: response.attempts,
        latency_ms: response.latencyMs,
        rag_response: response.data,
        scores: (response.data?.resultados || []).map((item) => item.relevancia),
        evaluation,
        approved: evaluation.approved,
      });
    } catch (error) {
      results.push({
        query,
        success: false,
        status: error.status || null,
        attempts: error.attempts || 1,
        latency_ms: error.latencyMs || 0,
        error: {
          name: error.name,
          code: error.code || null,
          message: error.message,
        },
        scores: [],
        evaluation: null,
        approved: false,
      });
    }
  }

  const latencies = results.map((result) => result.latency_ms).filter(Number.isFinite);
  const approvedCount = results.filter((result) => result.approved).length;

  return {
    scenario_id: scenario.id,
    estagio: stage.estagio,
    nome_estagio: stage.nome,
    semana_gestacional: stage.semana,
    dados_clinicos: stage.dados_clinicos,
    criteria,
    queries_executadas: results.length,
    queries_aprovadas: approvedCount,
    taxa_aprovacao: results.length ? approvedCount / results.length : 0,
    latencia_media_ms: Math.round(average(latencies)),
    latencia_max_ms: latencies.length ? Math.max(...latencies) : 0,
    resultados: results,
  };
}

async function runScenario(scenario, ragClient, options = {}) {
  if (!scenario || !Array.isArray(scenario.estagios)) {
    throw new TypeError('Cenário inválido: estagios deve ser um array.');
  }

  if (!ragClient || typeof ragClient.query !== 'function') {
    throw new TypeError('ragClient inválido: método query é obrigatório.');
  }

  const startedAt = new Date().toISOString();
  const stages = [];

  for (const stage of scenario.estagios) {
    stages.push(await executeStage(scenario, stage, ragClient, options));
  }

  const totalQueries = stages.reduce((sum, stage) => sum + stage.queries_executadas, 0);
  const totalApproved = stages.reduce((sum, stage) => sum + stage.queries_aprovadas, 0);

  return {
    scenario_id: scenario.id,
    nome: scenario.nome,
    guideline_alvo: scenario.guideline_alvo,
    started_at: startedAt,
    estagios_executados: stages.length,
    queries_executadas: totalQueries,
    queries_aprovadas: totalApproved,
    taxa_aprovacao: totalQueries ? totalApproved / totalQueries : 0,
    estagios: stages,
  };
}

module.exports = {
  evaluateRagResponse,
  executeStage,
  normalizeText,
  runScenario,
};
