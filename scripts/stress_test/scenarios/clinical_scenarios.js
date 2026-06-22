/**
 * @typedef {Object} ClinicalStage
 * @property {number} estagio
 * @property {string} nome
 * @property {number|null} semana
 * @property {Object<string, string|number|boolean|null>} dados_clinicos
 * @property {string[]} queries
 */

/**
 * @typedef {Object} ClinicalScenario
 * @property {string} id
 * @property {string} nome
 * @property {string} descricao
 * @property {string[]} guideline_alvo
 * @property {ClinicalStage[]} estagios
 */

const longReportQuery = Array.from(
  { length: 2000 },
  (_, index) => `dado_clinico_${index + 1}`
).join(' ');

/** @type {ClinicalScenario[]} */
const clinicalScenarios = [
  {
    id: 'preeclampsia',
    nome: 'Pré-eclâmpsia progressiva',
    descricao: 'Progressão de suspeita inicial até eclâmpsia com indicação de resolução imediata.',
    guideline_alvo: ['FEBRASGO', 'ACOG'],
    estagios: [
      {
        estagio: 1,
        nome: 'Suspeita inicial',
        semana: 20,
        dados_clinicos: {
          pressao_arterial: '138/88 mmHg',
          proteinuria: 'ausente',
          sintomas: 'assintomática',
        },
        queries: [
          'Gestante com 20 semanas, pressão limítrofe e sem proteinúria: como investigar risco de pré-eclâmpsia?',
          'Quais critérios e exames devem ser acompanhados na suspeita inicial de pré-eclâmpsia após 20 semanas?',
        ],
      },
      {
        estagio: 2,
        nome: 'Pré-eclâmpsia sem sinais de gravidade',
        semana: 24,
        dados_clinicos: {
          pressao_arterial: '145/95 mmHg',
          proteinuria: '1+',
          sintomas: 'edema discreto',
        },
        queries: [
          'Gestante de 24 semanas com PA 145/95 e proteinúria 1+: quais critérios confirmam pré-eclâmpsia?',
          'Qual monitorização materna e fetal é indicada na pré-eclâmpsia sem sinais de gravidade?',
        ],
      },
      {
        estagio: 3,
        nome: 'Pré-eclâmpsia com sinais de gravidade',
        semana: 28,
        dados_clinicos: {
          pressao_arterial: '165/112 mmHg',
          proteinuria: '3+',
          sintomas: 'cefaleia persistente',
        },
        queries: [
          'Gestante de 28 semanas com PA 165/112, proteinúria 3+ e cefaleia: qual a conduta imediata?',
          'Quando indicar sulfato de magnésio e anti-hipertensivo na pré-eclâmpsia grave?',
          'Quais sinais de gravidade exigem internação em gestante hipertensa com cefaleia?',
        ],
      },
      {
        estagio: 4,
        nome: 'Iminência de eclâmpsia e trombocitopenia',
        semana: 30,
        dados_clinicos: {
          pressao_arterial: '170/115 mmHg',
          plaquetas: '85000/mm³',
          sintomas: 'escotomas, dor epigástrica e hiperreflexia',
        },
        queries: [
          'Gestante de 30 semanas com escotomas, dor epigástrica, hiperreflexia e plaquetas 85000: como manejar iminência de eclâmpsia?',
          'Trombocitopenia e hipertensão grave na gestação sugerem síndrome HELLP? Quais exames e conduta?',
        ],
      },
      {
        estagio: 5,
        nome: 'Eclâmpsia instalada',
        semana: 32,
        dados_clinicos: {
          pressao_arterial: '180/120 mmHg',
          convulsao: true,
          estado_fetal: 'necessita avaliação imediata',
        },
        queries: [
          'Gestante de 32 semanas com convulsão e hipertensão grave: qual o manejo imediato da eclâmpsia?',
          'Após estabilização materna na eclâmpsia, quando indicar parto e qual o papel do sulfato de magnésio?',
        ],
      },
    ],
  },
  {
    id: 'diabetes_gestacional',
    nome: 'Diabetes gestacional descompensada',
    descricao: 'Progressão de alteração glicêmica até complicações fetais no fim da gestação.',
    guideline_alvo: ['Ministério da Saúde'],
    estagios: [
      {
        estagio: 1,
        nome: 'Diagnóstico no segundo trimestre',
        semana: 24,
        dados_clinicos: {
          glicemia_jejum_mg_dl: 95,
          totg: 'alterado',
        },
        queries: [
          'Gestante de 24 semanas com glicemia de jejum 95 mg/dL e TOTG alterado: quais critérios diagnósticos para diabetes gestacional?',
          'Qual abordagem inicial de dieta, atividade física e monitorização na diabetes gestacional?',
        ],
      },
      {
        estagio: 2,
        nome: 'Hiperglicemia persistente',
        semana: 28,
        dados_clinicos: {
          glicemia_jejum_mg_dl: 132,
          tratamento: 'medidas não farmacológicas insuficientes',
        },
        queries: [
          'Gestante de 28 semanas com glicemia persistente acima de 126 mg/dL: quando iniciar insulina?',
          'Quais metas glicêmicas e frequência de monitorização são recomendadas no diabetes gestacional em insulinoterapia?',
        ],
      },
      {
        estagio: 3,
        nome: 'Instabilidade glicêmica e macrossomia',
        semana: 32,
        dados_clinicos: {
          glicemia: 'instável',
          crescimento_fetal: 'macrossomia suspeita',
        },
        queries: [
          'Diabetes gestacional com glicemias instáveis e suspeita de macrossomia em 32 semanas: como acompanhar o feto?',
          'Quais riscos maternos e fetais estão associados à macrossomia no diabetes gestacional descompensado?',
        ],
      },
      {
        estagio: 4,
        nome: 'Polidrâmnio e sofrimento fetal',
        semana: 36,
        dados_clinicos: {
          liquido_amniotico: 'polidrâmnio',
          estado_fetal: 'sinais de sofrimento',
        },
        queries: [
          'Gestante diabética de 36 semanas com polidrâmnio e sinais de sofrimento fetal: qual a conduta obstétrica?',
          'Quando antecipar o parto em diabetes gestacional descompensado com comprometimento fetal?',
        ],
      },
    ],
  },
  {
    id: 'ciur',
    nome: 'Restrição de crescimento fetal',
    descricao: 'Progressão de feto pequeno para a idade gestacional até Doppler reverso.',
    guideline_alvo: ['Ministério da Saúde'],
    estagios: [
      {
        estagio: 1,
        nome: 'Suspeita de crescimento restrito',
        semana: 28,
        dados_clinicos: {
          circunferencia_abdominal_percentil: 10,
          doppler_umbilical: 'normal',
        },
        queries: [
          'Feto com circunferência abdominal no percentil 10 em 28 semanas: como diferenciar pequeno constitucional de CIUR?',
          'Quais medidas biométricas e exames Doppler devem ser acompanhados na suspeita de restrição de crescimento fetal?',
        ],
      },
      {
        estagio: 2,
        nome: 'Doppler umbilical alterado',
        semana: 30,
        dados_clinicos: {
          crescimento_fetal: 'abaixo do esperado',
          doppler_umbilical: 'resistência aumentada',
        },
        queries: [
          'CIUR em 30 semanas com resistência aumentada na artéria umbilical: qual vigilância fetal é recomendada?',
          'Como interpretar Doppler umbilical alterado na restrição de crescimento fetal?',
        ],
      },
      {
        estagio: 3,
        nome: 'Diástole zero',
        semana: 32,
        dados_clinicos: {
          doppler_umbilical: 'diástole zero',
          vitalidade_fetal: 'comprometida',
        },
        queries: [
          'Restrição de crescimento fetal em 32 semanas com diástole zero na artéria umbilical: internar ou interromper?',
          'Qual frequência de cardiotocografia e Doppler diante de fluxo diastólico ausente?',
        ],
      },
      {
        estagio: 4,
        nome: 'Doppler reverso',
        semana: 34,
        dados_clinicos: {
          doppler_umbilical: 'fluxo reverso',
          vitalidade_fetal: 'alto risco',
        },
        queries: [
          'CIUR de 34 semanas com fluxo reverso na artéria umbilical: há indicação de resolução imediata?',
          'Qual via e momento do parto em restrição de crescimento com Doppler reverso?',
        ],
      },
    ],
  },
  {
    id: 'edge_cases',
    nome: 'Edge cases sintéticos',
    descricao: 'Queries que exercitam limites de tamanho, idioma, coerência e valores extremos.',
    guideline_alvo: ['FEBRASGO', 'ACOG', 'Ministério da Saúde'],
    estagios: [
      {
        estagio: 1,
        nome: 'Entradas inválidas ou mínimas',
        semana: null,
        dados_clinicos: {},
        queries: ['', 'a'],
      },
      {
        estagio: 2,
        nome: 'Query extremamente longa',
        semana: null,
        dados_clinicos: { palavras_aproximadas: 2000 },
        queries: [longReportQuery],
      },
      {
        estagio: 3,
        nome: 'Query multilíngue',
        semana: null,
        dados_clinicos: { idioma: 'inglês' },
        queries: [
          'What is the recommended management for severe preeclampsia with persistent hypertension?',
        ],
      },
      {
        estagio: 4,
        nome: 'Valores críticos fora de faixa',
        semana: 30,
        dados_clinicos: {
          pressao_arterial: '300/200 mmHg',
          glicemia_mg_dl: 800,
        },
        queries: [
          'Gestante com pressão 300/200 e glicemia 800 mg/dL: quais riscos e medidas imediatas?',
        ],
      },
      {
        estagio: 5,
        nome: 'Query contraditória',
        semana: 28,
        dados_clinicos: {},
        queries: ['Pré-eclâmpsia sem hipertensão e sem proteinúria: qual o diagnóstico?'],
      },
      {
        estagio: 6,
        nome: 'Query coloquial',
        semana: null,
        dados_clinicos: {},
        queries: ['Minha pressão tá muito alta, estou grávida, o que faço?'],
      },
    ],
  },
];

function getClinicalScenario(scenarioId) {
  return clinicalScenarios.find((scenario) => scenario.id === scenarioId) || null;
}

module.exports = {
  clinicalScenarios,
  getClinicalScenario,
};
