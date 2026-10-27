const {
  calculateHadlockPercentile,
  generateFullGrowthChartBackground,
  GrowthValidationError
} = require('../utils/hadlockCalculator');

function calculatePercentile(data) {
  if (!data || typeof data !== 'object') {
    throw new GrowthValidationError('Corpo da requisição inválido.');
  }
  const { gestationalAgeWeeks, biometrics } = data;

  return calculateHadlockPercentile(
    gestationalAgeWeeks,
    biometrics
  );
}

function getGrowthChart() {
  return generateFullGrowthChartBackground();
}

module.exports = {
  calculatePercentile,
  getGrowthChart,
  GrowthValidationError
};