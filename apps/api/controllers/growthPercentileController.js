const growthService = require('../services/growthPercentileService');
const logger = require('../utils/logger');
const { sendInternalError } = require('../utils/httpErrors');

async function calculatePercentile(req, res) {
  try {
    const result = growthService.calculatePercentile(req.body);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof growthService.GrowthValidationError) {
      return res.status(400).json({ error: err.message });
    }
    logger.error('Erro ao calcular percentil', { details: err.message });
    return sendInternalError(res);
  }
}

async function getGrowthChart(req, res) {
  try {
    const chart = growthService.getGrowthChart();
    return res.status(200).json(chart);
  } catch (err) {
    logger.error('Erro ao obter grafico de crescimento', { details: err.message });
    return sendInternalError(res);
  }
}

module.exports = {
  calculatePercentile,
  getGrowthChart
};