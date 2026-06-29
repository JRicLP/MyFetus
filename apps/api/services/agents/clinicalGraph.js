const { analyzeMaternal } = require('./maternalAgent');
const { analyzeFetal } = require('./fetalAgent');
const { sanitizeForLLM } = require('../../utils/piiSanitizer');

const MATERNAL_TERMS = [
  'pressao', 'pressão', 'pa ', 'imc', 'peso', 'vacina', 'vacinas',
  'glicemia', 'diabetes', 'medicamento', 'ibuprofeno', 'acido folico',
  'ácido fólico', 'cabeca', 'cabeça', 'visao', 'visão',
];

const FETAL_TERMS = [
  'bebe', 'bebê', 'fetal', 'feto', 'altura uterina', 'ultrassom',
  'ultrassonografia', 'doppler', 'mexer', 'movimento', 'crescimento',
  'pequeno', 'frequencia cardiaca', 'frequência cardíaca',
];

const CRITICAL_RULES = [
  {
    regex: /(dor de cabe[cç]a|cefaleia).*(vis[aã]o turva|escotoma|luzes)|((vis[aã]o turva|escotoma).*(dor de cabe[cç]a|cefaleia))/i,
    reason: 'Sintomas neurológicos associados a possível síndrome hipertensiva na gestação.',
  },
  {
    regex: /(beb[eê]|feto).*(parou|sem|n[aã]o).*(mexer|movimentar|movimentos?)|movimentos? fetais?.*(ausentes?|reduzidos?)/i,
    reason: 'Redução ou ausência de movimentos fetais pode indicar emergência obstétrica.',
  },
  {
    regex: /ibuprofeno|anti[-\s]?inflamat[oó]rio/i,
    reason: 'Uso de anti-inflamatório na gestação exige avaliação médica, especialmente no terceiro trimestre.',
  },
  {
    regex: /(press[aã]o|pa)\D*(1[6-9]\d|[2-9]\d{2})\D*(\/|por)\D*(1[1-9]\d|[2-9]\d{2})|170\s*\/\s*115/i,
    reason: 'Pressão arterial em faixa de crise hipertensiva exige avaliação imediata.',
  },
  {
    regex: /sangramento intenso|convuls[aã]o|desmaio|perda de liquido|perda de líquido/i,
    reason: 'Sintoma de alarme obstétrico que precisa de atendimento presencial.',
  },
];

function normalize(text) {
  return String(text || '').toLowerCase();
}

function detectHumanReview(query) {
  const matched = CRITICAL_RULES.find((rule) => rule.regex.test(query));
  if (!matched) return { needs_human_review: false, ambiguity_reason: null };
  return {
    needs_human_review: true,
    ambiguity_reason: matched.reason,
  };
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function routeAgents(query) {
  const normalized = normalize(query);
  if (normalized.trim().length < 12) {
    return { route: 'clarify', maternal: false, fetal: false };
  }

  const maternal = includesAny(normalized, MATERNAL_TERMS);
  const fetal = includesAny(normalized, FETAL_TERMS);

  if (!maternal && !fetal) {
    return { route: 'clarify', maternal: false, fetal: false };
  }
  if (maternal && fetal) return { route: 'both', maternal: true, fetal: true };
  if (fetal) return { route: 'fetal', maternal: false, fetal: true };
  return { route: 'maternal', maternal: true, fetal: false };
}

function uniqueSources(sources) {
  const seen = new Set();
  return sources.filter((source) => {
    const key = [
      source.fonte,
      source.pagina,
      source.secao,
      source.documento_id,
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function synthesizeFinalResponse(state) {
  if (state.needs_human_review) {
    return 'Pelos sinais descritos, esta situação precisa de avaliação humana imediata. Procure atendimento obstétrico presencial ou serviço de urgência, e leve seus registros de pré-natal.';
  }
  if (state.route === 'clarify') {
    return 'Preciso de mais detalhes para direcionar a análise com segurança. Informe semanas de gestação, sintoma principal e há quanto tempo isso ocorre.';
  }

  const parts = [];
  if (state.maternal_analysis) parts.push(`Análise materna: ${state.maternal_analysis}`);
  if (state.fetal_analysis) parts.push(`Análise fetal: ${state.fetal_analysis}`);
  return `${parts.join('\n\n')}\n\nEsta orientação não substitui consulta médica.`;
}

async function runClinicalAgentGraph(input, dependencies = {}) {
  const query = input.query;
  const sanitizedQuery = input.sanitized_query || sanitizeForLLM(query);
  const route = routeAgents(sanitizedQuery);
  const review = detectHumanReview(sanitizedQuery);
  const state = {
    query,
    sanitized_query: sanitizedQuery,
    patient_context: input.patient_context || null,
    route: route.route,
    maternal_analysis: '',
    fetal_analysis: '',
    needs_human_review: review.needs_human_review,
    ambiguity_reason: review.ambiguity_reason,
    final_response: '',
    sources: [],
  };

  if (state.needs_human_review || route.route === 'clarify') {
    state.final_response = synthesizeFinalResponse(state);
    return state;
  }

  const maternalRunner = dependencies.analyzeMaternal || analyzeMaternal;
  const fetalRunner = dependencies.analyzeFetal || analyzeFetal;
  const retrieveChunks = dependencies.retrieveChunks;
  const tasks = [];

  if (route.maternal) {
    tasks.push(
      maternalRunner({
        query: sanitizedQuery,
        patientContext: state.patient_context,
        retrieveChunks,
        topK: input.topK,
      }).then((result) => {
        state.maternal_analysis = result.analysis || '';
        state.sources.push(...(result.sources || []));
      })
    );
  }

  if (route.fetal) {
    tasks.push(
      fetalRunner({
        query: sanitizedQuery,
        patientContext: state.patient_context,
        retrieveChunks,
        topK: input.topK,
      }).then((result) => {
        state.fetal_analysis = result.analysis || '';
        state.sources.push(...(result.sources || []));
      })
    );
  }

  await Promise.all(tasks);
  state.sources = uniqueSources(state.sources);
  state.final_response = dependencies.synthesizeFinalResponse
    ? dependencies.synthesizeFinalResponse(state)
    : synthesizeFinalResponse(state);
  return state;
}

module.exports = {
  CRITICAL_RULES,
  detectHumanReview,
  routeAgents,
  runClinicalAgentGraph,
  synthesizeFinalResponse,
};
