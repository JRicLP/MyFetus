// apps/api/tests/hadlockCalculator.test.js

const assert = require('assert');
const { 
  calculateHadlockPercentile, 
  calculateEstimatedWeight,
  calculateExpectedMedianWeight,
  generateFullGrowthChartBackground,
  generateCurvePointsForWeek
} = require('../utils/hadlockCalculator');

console.log('--- Iniciando Testes: Hadlock Percentile Calculator Engine ---\n');

let testesPassados = 0;
let testesFalhados = 0;

function runTest(nomeDoTeste, callback) {
  try {
    callback();
    console.log(`✅ PASSOU: ${nomeDoTeste}`);
    testesPassados++;
  } catch (error) {
    console.error(`❌ FALHOU: ${nomeDoTeste}`);
    console.error(`   ${error.message}`);
    testesFalhados++;
  }
}

// ----------------------------------------------------------------------
// Suíte 1: Cálculo de Limites e Indeterminações
// ----------------------------------------------------------------------

runTest('Deve lançar erro quando as medidas biométricas forem nulas ou negativas', () => {
  const invalidBiometrics = { dbp: -5, cc: 0, ca: 10, cf: 5 };
  assert.throws(
    () => calculateHadlockPercentile(20, invalidBiometrics),
    /Parâmetros biométricos inválidos/,
    'Não lançou o erro esperado de parâmetros inválidos'
  );
});

runTest('Deve lançar erro se a idade gestacional estiver fora da janela clínica (10-42 semanas)', () => {
  const validBiometrics = { dbp: 50, cc: 180, ca: 150, cf: 35 };
  assert.throws(
    () => calculateHadlockPercentile(8, validBiometrics),
    /A idade gestacional deve estar entre 10 e 42/
  );
  assert.throws(
    () => calculateHadlockPercentile(45, validBiometrics),
    /A idade gestacional deve estar entre 10 e 42/
  );
});

// ----------------------------------------------------------------------
// Suíte 2: Precisão Matemática (sem usar mocks)
// ----------------------------------------------------------------------

runTest('Cálculo do PFE deve retornar um valor realista para biometria de ~32 semanas', () => {
  const biometrics32w = { dbp: 82, cc: 300, ca: 280, cf: 62 }; 
  const efw = calculateEstimatedWeight(biometrics32w);
  
  // Um feto de 32 semanas ronda os 1800g a 2000g dependendo da biometria
  assert.ok(efw > 1800 && efw < 2100, `O peso de ${efw.toFixed(2)}g está fora do padrão esperado`);
});

runTest('O percentil deve ficar próximo da média (30-70) para uma biometria comum de 24 semanas', () => {
  const gaWeeks = 24;
  const biometrics24w = { dbp: 60, cc: 220, ca: 200, cf: 43 }; // Biometria aproximada P50 para 24s
  
  const result = calculateHadlockPercentile(gaWeeks, biometrics24w);
  
  assert.ok(result.percentile > 30 && result.percentile < 70, 
    `Percentil ${result.percentile} calculado não reflete uma biometria normal para a idade`);
  
  // O Z-Score também deve refletir estar perto do centro (entre -0.5 e 0.5 desvios)
  assert.ok(result.zScore > -0.5 && result.zScore < 0.5, 'Z-Score muito discrepante');
});

runTest('Deve identificar um feto com crescimento elevado (percentil alto)', () => {
  const gaWeeks = 30;
  // Inserindo medidas anormalmente grandes para 30 semanas (simulando feto macrossómico)
  const hugeBiometrics = { dbp: 90, cc: 320, ca: 300, cf: 65 }; 
  
  const result = calculateHadlockPercentile(gaWeeks, hugeBiometrics);
  
  assert.ok(result.percentile > 90.00, `Esperado percentil > 90, mas obteve ${result.percentile}`);
  assert.ok(result.zScore > 1.28, `Esperado zScore > 1.28, mas obteve ${result.zScore}`);
});

// ----------------------------------------------------------------------
// Suíte 3: Geração de Dados para Gráficos (Frontend)
// ----------------------------------------------------------------------

runTest('Deve gerar os pontos da curva (P10, P50, P90) corretamente para uma semana específica', () => {
  const gaWeeks = 24;
  const points = generateCurvePointsForWeek(gaWeeks);
  
  assert.strictEqual(points.semana, 24, 'A semana retornada está incorreta');
  
  // O peso no percentil 50 deve ser igual ao peso mediano esperado
  const expectedP50 = Math.round(calculateExpectedMedianWeight(gaWeeks));
  assert.strictEqual(points.p50, expectedP50, 'P50 não corresponde ao peso mediano');
  
  // Validar se a distribuição lógica faz sentido (P10 < P50 < P90)
  assert.ok(points.p10 < points.p50, 'P10 deve ser menor que P50');
  assert.ok(points.p90 > points.p50, 'P90 deve ser maior que P50');
});

runTest('Deve gerar a matriz completa da curva de crescimento (semanas 10 a 40)', () => {
  const fullChart = generateFullGrowthChartBackground();
  
  // De 10 a 40 semanas, inclusive, temos 31 elementos
  assert.strictEqual(fullChart.length, 31, `Esperava 31 elementos, mas obteve ${fullChart.length}`);
  
  // O primeiro elemento deve ser a semana 10
  assert.strictEqual(fullChart[0].semana, 10, 'O primeiro elemento deve ser a semana 10');
  
  // O último elemento deve ser a semana 40
  assert.strictEqual(fullChart[fullChart.length - 1].semana, 40, 'O último elemento deve ser a semana 40');
  
  // Verificar se os dados do último elemento contêm números válidos
  assert.ok(fullChart[30].p90 > 0, 'O peso na semana 40 deve ser um número positivo');
});

// ----------------------------------------------------------------------
// Relatório Final
// ----------------------------------------------------------------------
console.log('\n--- Resultado Final ---');
console.log(`Passaram: ${testesPassados}`);
console.log(`Falharam: ${testesFalhados}`);

if (testesFalhados > 0) {
  process.exit(1);
}