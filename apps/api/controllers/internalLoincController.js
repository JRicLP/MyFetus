const {
  mapClinicalTerm,
  mapClinicalText,
  buildMappingSummary,
  ensureCatalogLoaded,
} = require('../utils/loincMapper');

const mapSingleTerm = async (req, res) => {
  try {
    const { term } = req.body || {};

    if (!term || typeof term !== 'string') {
      return res.status(400).json({
        error: 'term é obrigatório e deve ser uma string',
      });
    }

    // Garante que o catálogo está carregado
    await ensureCatalogLoaded();

    const result = mapClinicalTerm(term);

    return res.status(200).json({
      source: 'dba-loinc-v1',
      input: term,
      result,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Falha ao mapear termo clínico',
      details: error.message,
    });
  }
};

const mapTextBlock = async (req, res) => {
  try {
    const { text } = req.body || {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'text é obrigatório e deve ser uma string',
      });
    }

    // Garante que o catálogo está carregado
    await ensureCatalogLoaded();

    const result = mapClinicalText(text);

    return res.status(200).json({
      source: 'dba-loinc-v1',
      input: text,
      result,
      summary: buildMappingSummary(result.mappedTerms),
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Falha ao mapear bloco de texto clínico',
      details: error.message,
    });
  }
};

module.exports = {
  mapSingleTerm,
  mapTextBlock,
};