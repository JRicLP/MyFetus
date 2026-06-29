const {
  calculateHadlockPercentile,
  generateFullGrowthChartBackground
} = require('../utils/hadlockCalculator');

function calculatePercentile(data) {
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
  getGrowthChart
};