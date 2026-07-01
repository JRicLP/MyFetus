const growthService = require('../services/growthPercentileService');

async function calculatePercentile(req, res) {
  try {
    const result =
      growthService.calculatePercentile(req.body);

    return res.status(200).json(result);

  } catch (err) {
    return res.status(400).json({
      error: err.message
    });
  }
}

async function getGrowthChart(req, res) {
  try {
    const chart =
      growthService.getGrowthChart();

    return res.status(200).json(chart);

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}

module.exports = {
  calculatePercentile,
  getGrowthChart
};