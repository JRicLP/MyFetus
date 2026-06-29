const generationService = require('../generationService');

const MATERNAL_FILTERS = {
  $or: [
    { tema: { $in: ['saude_materna', 'pre_eclampsia', 'vacinas', 'nutricao'] } },
    { source: { $in: ['FEBRASGO', 'Manual MS Gestacao Alto Risco'] } },
  ],
};

async function analyzeMaternal({
  query,
  patientContext,
  retrieveChunks,
  topK = 5,
}) {
  const sources = retrieveChunks
    ? await retrieveChunks(query, topK, MATERNAL_FILTERS)
    : [];
  const analysis = await generationService.generateMaternalAgentAnalysis(
    query,
    sources,
    patientContext
  );

  return {
    active: true,
    analysis,
    sources,
  };
}

module.exports = {
  MATERNAL_FILTERS,
  analyzeMaternal,
};
