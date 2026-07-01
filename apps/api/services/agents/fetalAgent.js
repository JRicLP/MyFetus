const generationService = require('../generationService');

const FETAL_FILTERS = {
  $or: [
    { tema: { $in: ['desenvolvimento_fetal', 'ultrassonografia', 'altura_uterina'] } },
    { section: { $in: ['ultrassonografia', 'crescimento fetal', 'doppler'] } },
  ],
};

async function analyzeFetal({
  query,
  retrieveChunks,
  topK = 5,
}) {
  const sources = retrieveChunks
    ? await retrieveChunks(query, topK, FETAL_FILTERS)
    : [];
  const analysis = await generationService.generateAnswer(query, sources);

  return {
    active: true,
    analysis,
    sources,
  };
}

module.exports = {
  FETAL_FILTERS,
  analyzeFetal,
};
