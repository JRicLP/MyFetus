/**
 * loincMapper.js (refatorado para usar banco de dados)
 *
 * Responsável pelo mapeamento de termos clínicos para códigos LOINC.
 * 
 * Estratégia:
 * 1. Carrega o catálogo do banco de dados na inicialização
 * 2. Mantém um cache em memória para performance
 * 3. Normaliza text, tokeniza e marca candidatos
 * 4. Retorna mapeado, ambíguo ou não-mapeado
 */

let LOINC_CATALOG = []; // Cache em memória
let catalogLoaded = false;

const getFallbackCatalog = () => {
  try {
    const { INITIAL_LOINC_CATALOG } = require('./loincInitializer');
    return Array.isArray(INITIAL_LOINC_CATALOG) ? INITIAL_LOINC_CATALOG : [];
  } catch (_) {
    return [];
  }
};

const normalizeText = (value) => {
  if (value === null || value === undefined) return '';

  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const tokenize = (value) => normalizeText(value).split(' ').filter(Boolean);

const scoreAliasMatch = (input, alias) => {
  if (!input || !alias) return 0;

  if (input === alias) return 1;

  const inputTokens = tokenize(input);
  const aliasTokens = tokenize(alias);

  if (aliasTokens.length === 0 || inputTokens.length === 0) return 0;

  const aliasInInput = aliasTokens.every((token) => inputTokens.includes(token));
  if (aliasInInput) {
    if (inputTokens.length === aliasTokens.length) return 0.98;
    return 0.88;
  }

  const overlap = aliasTokens.filter((token) => inputTokens.includes(token)).length;
  const overlapRatio = overlap / aliasTokens.length;

  if (overlapRatio >= 0.5) {
    return 0.72 + overlapRatio * 0.15;
  }

  return 0;
};

const buildMatch = (entry, alias, score, input) => ({
  input,
  normalizedInput: normalizeText(input),
  normalizedAlias: normalizeText(alias),
  status: 'mapped',
  matchType: score >= 0.98 ? 'exact' : 'partial',
  confidence: Number(score.toFixed(2)),
  loinc: entry.loinc,
  canonicalTerm: entry.canonicalTerm,
  category: entry.category,
  specimen: entry.specimen,
  unit: entry.unit,
  matchedAlias: alias,
  source: 'dba-loinc-v1',
});

const mapClinicalTerm = (term) => {
  if (LOINC_CATALOG.length === 0) {
    LOINC_CATALOG = getFallbackCatalog();
  }

  const input = normalizeText(term);

  if (!input) {
    return {
      input: term,
      normalizedInput: '',
      status: 'unmapped',
      confidence: 0,
      source: 'dba-loinc-v1',
      reason: 'empty_input',
      candidates: [],
    };
  }

  const scoredCandidates = [];

  for (const entry of LOINC_CATALOG) {
    for (const alias of [entry.canonicalTerm, ...entry.aliases]) {
      const score = scoreAliasMatch(input, normalizeText(alias));

      if (score > 0) {
        scoredCandidates.push({ entry, alias, score });
      }
    }
  }

  if (scoredCandidates.length === 0) {
    return {
      input: term,
      normalizedInput: input,
      status: 'unmapped',
      confidence: 0,
      source: 'dba-loinc-v1',
      reason: 'no_match',
      candidates: [],
    };
  }

  scoredCandidates.sort((left, right) => right.score - left.score);

  const [bestCandidate, secondCandidate] = scoredCandidates;

  if (
    secondCandidate &&
    bestCandidate.entry.loinc !== secondCandidate.entry.loinc &&
    bestCandidate.score - secondCandidate.score <= 0.08
  ) {
    return {
      input: term,
      normalizedInput: input,
      status: 'ambiguous',
      confidence: Number(bestCandidate.score.toFixed(2)),
      source: 'dba-loinc-v1',
      reason: 'close_candidates',
      match: buildMatch(bestCandidate.entry, bestCandidate.alias, bestCandidate.score, term),
      candidates: scoredCandidates.slice(0, 3).map(({ entry, alias, score }) =>
        buildMatch(entry, alias, score, term)
      ),
    };
  }

  return buildMatch(bestCandidate.entry, bestCandidate.alias, bestCandidate.score, term);
};

const mapClinicalText = (text) => {
  const lines = String(text || '')
    .split(/\r?\n|\|/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const mappedTerms = lines.map((line) => mapClinicalTerm(line));

  return {
    source: 'dba-loinc-v1',
    originalText: text,
    mappedTerms,
    summary: buildMappingSummary(mappedTerms),
  };
};

const buildMappingSummary = (mappedTerms) => {
  const total = mappedTerms.length;
  const mapped = mappedTerms.filter((item) => item.status === 'mapped').length;
  const ambiguous = mappedTerms.filter((item) => item.status === 'ambiguous').length;
  const unmapped = mappedTerms.filter((item) => item.status === 'unmapped').length;

  return {
    total,
    mapped,
    ambiguous,
    unmapped,
    coverage: total === 0 ? 0 : Number((mapped / total).toFixed(2)),
  };
};

/**
 * Carrega o catálogo LOINC do banco de dados para o cache em memória
 */
async function loadCatalogFromDb() {
  if (catalogLoaded) return;

  try {
    const { getLoincCatalogFromDb } = require('./loincInitializer');
    const catalog = await getLoincCatalogFromDb();
    LOINC_CATALOG = catalog;
    catalogLoaded = true;
    console.log(`✓ Catálogo LOINC carregado em memória: ${LOINC_CATALOG.length} termos`);
  } catch (error) {
    console.error('Erro ao carregar catálogo LOINC do banco:', error.message);
    // Se falhar, mantém o catálogo em memória vazio ou usa fallback
    catalogLoaded = true;
  }
}

/**
 * Garante que o catálogo está carregado antes de fazer buscas
 */
async function ensureCatalogLoaded() {
  if (!catalogLoaded) {
    await loadCatalogFromDb();
  }
}

module.exports = {
  normalizeText,
  tokenize,
  scoreAliasMatch,
  mapClinicalTerm,
  mapClinicalText,
  buildMappingSummary,
  loadCatalogFromDb,
  ensureCatalogLoaded,
  getCatalogStatus: () => ({ loaded: catalogLoaded, count: LOINC_CATALOG.length }),
};