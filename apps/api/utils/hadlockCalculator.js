// apps/api/utils/hadlockCalculator.js

/**
 * Interface esperada de Biometria Fetal (medidas em milímetros)
 * @typedef {Object} FetalBiometrics
 * @property {number} dbp - Diâmetro Biparietal (mm)
 * @property {number} cc - Circunferência Cefálica (mm)
 * @property {number} ca - Circunferência Abdominal (mm)
 * @property {number} cf - Comprimento do Fêmur (mm)
 */

// --- FUNÇÕES UTILITÁRIAS MATEMÁTICAS ---

/**
 * Aproximação de Abramowitz e Stegun para a Função de Erro (erf)
 * Necessária para calcular a Distribuição Normal Acumulada.
 */
function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p  = 0.3275911;

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

/**
 * Função de Distribuição Acumulada (CDF) para a distribuição normal padrão
 * Converte o Z-Score numa probabilidade (0.0 a 1.0)
 */
function normalCDF(z) {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

// --- LÓGICA CLÍNICA DE HADLOCK ---

/**
 * Calcula o Peso Fetal Estimado (PFE) usando a fórmula de Hadlock IV
 */
// --- LÓGICA CLÍNICA DE HADLOCK ---

/**
 * Calcula o Peso Fetal Estimado (PFE) usando a fórmula de Hadlock IV
 */
function calculateEstimatedWeight(biometrics) {
  // CORREÇÃO 1: Usando 'let' para permitir a conversão para centímetros
  let { dbp, cc, ca, cf } = biometrics || {};

  if (
    typeof dbp !== 'number' || dbp <= 0 ||
    typeof cc !== 'number' || cc <= 0 ||
    typeof ca !== 'number' || ca <= 0 ||
    typeof cf !== 'number' || cf <= 0
  ) {
    throw new Error('Parâmetros biométricos inválidos. Todas as medidas devem ser números maiores que zero.');
  }

  // Convertendo mm para cm (agora permitido pelo 'let')
  dbp = dbp / 10;
  cc = cc / 10;
  ca = ca / 10;
  cf = cf / 10;

  const log10Weight = 1.3596 
    - (0.00386 * ca * cf) 
    + (0.0064 * cc) 
    + (0.00061 * dbp * ca) 
    + (0.0424 * ca) 
    + (0.174 * cf);

  return Math.pow(10, log10Weight);
}

/**
 * Calcula o peso mediano esperado para a idade gestacional (Fórmula de Hadlock 1991)
 */
function calculateExpectedMedianWeight(gaWeeks) {
  // CORREÇÃO 2: Verificação rígida de tipo para a idade gestacional
  if (typeof gaWeeks !== 'number' || isNaN(gaWeeks) || gaWeeks < 10 || gaWeeks > 42) {
    throw new Error('A idade gestacional deve ser um número válido entre 10 e 42 semanas.');
  }
  
  // Equação correta de Hadlock para o 50º percentil
  const lnWeight = 0.578 + (0.332 * gaWeeks) - (0.00354 * Math.pow(gaWeeks, 2));
    
  return Math.exp(lnWeight);
}

/**
 * Calcula o percentil e o Z-Score para uma determinada biometria e idade gestacional
 */
function calculateHadlockPercentile(gestationalAgeWeeks, biometrics) {
  const estimatedWeightGrams = calculateEstimatedWeight(biometrics);
  const expectedMedianWeight = calculateExpectedMedianWeight(gestationalAgeWeeks);
  
  // CORREÇÃO 3: Distribuição Log-Normal para precisão clínica nos extremos
  const logCV = 0.12; // 12% de coeficiente de variação
  const zScore = (Math.log(estimatedWeightGrams) - Math.log(expectedMedianWeight)) / logCV;
  
  // Transformação matemática do Z-Score no percentil exato
  const percentile = normalCDF(zScore) * 100;
  
  return {
    estimatedWeightGrams: Math.round(estimatedWeightGrams),
    expectedMedianWeight: Math.round(expectedMedianWeight),
    percentile: parseFloat(percentile.toFixed(2)),
    zScore: parseFloat(zScore.toFixed(3))
  };
}

/**
 * Gera os dados de fundo para o Frontend desenhar o gráfico da curva de Hadlock.
 * Retorna os pesos esperados para os percentis 10, 50 e 90 numa dada semana.
 */
function generateCurvePointsForWeek(gaWeeks) {
  const p50Weight = calculateExpectedMedianWeight(gaWeeks);
  const stdDev = p50Weight * 0.12; // 12% de desvio padrão na curva de Hadlock

  // Z-scores aproximados para os limites clínicos normais
  const zScoreP10 = -1.28155; 
  const zScoreP90 = 1.28155;

  return {
    semana: gaWeeks,
    p10: Math.round(p50Weight + (zScoreP10 * stdDev)),
    p50: Math.round(p50Weight),
    p90: Math.round(p50Weight + (zScoreP90 * stdDev))
  };
}

/**
 * Gera a curva completa de crescimento desde as 10 até às 40 semanas
 */
function generateFullGrowthChartBackground() {
  const chartData = [];
  for (let week = 10; week <= 40; week++) {
    chartData.push(generateCurvePointsForWeek(week));
  }
  return chartData;
}

module.exports = {
  calculateHadlockPercentile,
  calculateEstimatedWeight,
  calculateExpectedMedianWeight,
  generateCurvePointsForWeek,
  generateFullGrowthChartBackground
};

