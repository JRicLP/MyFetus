const test = require('node:test');
const assert = require('node:assert');
const {
  routeAgents,
  runClinicalAgentGraph,
} = require('../services/agents/clinicalGraph');

function makeMaternalMock(label = 'Materno') {
  return async () => ({
    analysis: `${label}: análise de saúde materna.`,
    sources: [{ fonte: 'FEBRASGO', secao: 'materna', relevancia: 0.91 }],
  });
}

function makeFetalMock(label = 'Fetal') {
  return async () => ({
    analysis: `${label}: análise de desenvolvimento fetal.`,
    sources: [{ fonte: 'Manual MS', secao: 'fetal', relevancia: 0.88 }],
  });
}

test.describe('Clinical Graph - fluxo de diálogo entre agentes', () => {
  test.it('roteia consulta apenas materna', async () => {
    const state = await runClinicalAgentGraph({
      query: 'Meu IMC está adequado para 28 semanas?',
    }, {
      analyzeMaternal: makeMaternalMock(),
      analyzeFetal: makeFetalMock(),
    });

    assert.deepStrictEqual(routeAgents(state.sanitized_query), {
      route: 'maternal',
      maternal: true,
      fetal: false,
    });
    assert.match(state.maternal_analysis, /saúde materna/);
    assert.strictEqual(state.fetal_analysis, '');
    assert.strictEqual(state.sources.length, 1);
  });

  test.it('roteia consulta apenas fetal', async () => {
    const state = await runClinicalAgentGraph({
      query: 'A altura uterina de 26 cm para 28 semanas é normal?',
    }, {
      analyzeMaternal: makeMaternalMock(),
      analyzeFetal: makeFetalMock(),
    });

    assert.strictEqual(state.route, 'fetal');
    assert.strictEqual(state.maternal_analysis, '');
    assert.match(state.fetal_analysis, /desenvolvimento fetal/);
    assert.strictEqual(state.sources[0].secao, 'fetal');
  });

  test.it('aciona ambos os agentes e sintetiza as duas análises', async () => {
    const state = await runClinicalAgentGraph({
      query: 'Minha pressão está alta e o bebê parece pequeno para a semana',
    }, {
      analyzeMaternal: makeMaternalMock(),
      analyzeFetal: makeFetalMock(),
    });

    assert.strictEqual(state.route, 'both');
    assert.match(state.maternal_analysis, /materna/);
    assert.match(state.fetal_analysis, /fetal/);
    assert.match(state.final_response, /Análise materna/);
    assert.match(state.final_response, /Análise fetal/);
    assert.strictEqual(state.sources.length, 2);
  });

  test.it('solicita clarificação sem acionar agentes quando a triagem é inconclusa', async () => {
    let maternalCalls = 0;
    let fetalCalls = 0;
    const state = await runClinicalAgentGraph({
      query: 'está normal?',
    }, {
      analyzeMaternal: async () => {
        maternalCalls += 1;
        return { analysis: 'não deveria rodar', sources: [] };
      },
      analyzeFetal: async () => {
        fetalCalls += 1;
        return { analysis: 'não deveria rodar', sources: [] };
      },
    });

    assert.strictEqual(state.route, 'clarify');
    assert.strictEqual(maternalCalls, 0);
    assert.strictEqual(fetalCalls, 0);
    assert.match(state.final_response, /mais detalhes/i);
  });
});
