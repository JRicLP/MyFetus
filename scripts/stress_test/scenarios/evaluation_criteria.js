/**
 * Os critérios abaixo funcionam como ground truth de recuperação, não como
 * recomendação médica autônoma. Eles refletem os temas esperados nas guidelines
 * já indexadas pelo projeto.
 */
const evaluationCriteria = [
  {
    scenario_id: 'preeclampsia',
    estagio: 1,
    fontes_esperadas: ['FEBRASGO', 'ACOG'],
    termos_obrigatorios: ['pressão arterial', 'proteinúria'],
    relevancia_minima: 0.65,
    latencia_maxima_ms: 3000,
    justificativa: 'A suspeita inicial depende da avaliação conjunta da pressão arterial e de sinais de proteinúria.',
  },
  {
    scenario_id: 'preeclampsia',
    estagio: 2,
    fontes_esperadas: ['FEBRASGO', 'ACOG'],
    termos_obrigatorios: ['hipertensão', 'proteinúria', 'monitorização'],
    relevancia_minima: 0.65,
    latencia_maxima_ms: 3000,
    justificativa: 'O estágio exige confirmação diagnóstica e vigilância materno-fetal.',
  },
  {
    scenario_id: 'preeclampsia',
    estagio: 3,
    fontes_esperadas: ['FEBRASGO', 'ACOG'],
    termos_obrigatorios: ['sulfato de magnésio', 'hipertensão grave', 'cefaleia'],
    relevancia_minima: 0.65,
    latencia_maxima_ms: 3000,
    justificativa: 'Sinais de gravidade devem recuperar conteúdo sobre estabilização, prevenção de convulsões e tratamento da hipertensão.',
  },
  {
    scenario_id: 'preeclampsia',
    estagio: 4,
    fontes_esperadas: ['FEBRASGO', 'ACOG'],
    termos_obrigatorios: ['eclâmpsia', 'plaquetas', 'HELLP'],
    relevancia_minima: 0.65,
    latencia_maxima_ms: 3000,
    justificativa: 'Trombocitopenia e sintomas neurológicos requerem cobertura de iminência de eclâmpsia e síndrome HELLP.',
  },
  {
    scenario_id: 'preeclampsia',
    estagio: 5,
    fontes_esperadas: ['FEBRASGO', 'ACOG'],
    termos_obrigatorios: ['convulsão', 'sulfato de magnésio', 'parto'],
    relevancia_minima: 0.65,
    latencia_maxima_ms: 3000,
    justificativa: 'Eclâmpsia instalada demanda estabilização imediata, controle de convulsão e planejamento da resolução.',
  },
  {
    scenario_id: 'diabetes_gestacional',
    estagio: 1,
    fontes_esperadas: ['Ministério da Saúde'],
    termos_obrigatorios: ['glicemia', 'TOTG', 'diabetes gestacional'],
    relevancia_minima: 0.6,
    latencia_maxima_ms: 3000,
    justificativa: 'O estágio inicial deve recuperar critérios diagnósticos e manejo não farmacológico.',
  },
  {
    scenario_id: 'diabetes_gestacional',
    estagio: 2,
    fontes_esperadas: ['Ministério da Saúde'],
    termos_obrigatorios: ['insulina', 'glicemia', 'monitorização'],
    relevancia_minima: 0.6,
    latencia_maxima_ms: 3000,
    justificativa: 'Hiperglicemia persistente requer conteúdo sobre metas e insulinoterapia.',
  },
  {
    scenario_id: 'diabetes_gestacional',
    estagio: 3,
    fontes_esperadas: ['Ministério da Saúde'],
    termos_obrigatorios: ['macrossomia', 'crescimento fetal', 'glicemia'],
    relevancia_minima: 0.6,
    latencia_maxima_ms: 3000,
    justificativa: 'Instabilidade glicêmica deve recuperar riscos de macrossomia e vigilância fetal.',
  },
  {
    scenario_id: 'diabetes_gestacional',
    estagio: 4,
    fontes_esperadas: ['Ministério da Saúde'],
    termos_obrigatorios: ['polidrâmnio', 'sofrimento fetal', 'parto'],
    relevancia_minima: 0.6,
    latencia_maxima_ms: 3000,
    justificativa: 'Complicações no fim da gestação devem recuperar avaliação de vitalidade e momento da resolução.',
  },
  {
    scenario_id: 'ciur',
    estagio: 1,
    fontes_esperadas: ['Ministério da Saúde'],
    termos_obrigatorios: ['crescimento fetal', 'percentil', 'Doppler'],
    relevancia_minima: 0.6,
    latencia_maxima_ms: 3000,
    justificativa: 'A suspeita de CIUR exige biometria seriada e avaliação Doppler.',
  },
  {
    scenario_id: 'ciur',
    estagio: 2,
    fontes_esperadas: ['Ministério da Saúde'],
    termos_obrigatorios: ['artéria umbilical', 'Doppler', 'vigilância fetal'],
    relevancia_minima: 0.6,
    latencia_maxima_ms: 3000,
    justificativa: 'Alteração da resistência umbilical muda a intensidade da vigilância fetal.',
  },
  {
    scenario_id: 'ciur',
    estagio: 3,
    fontes_esperadas: ['Ministério da Saúde'],
    termos_obrigatorios: ['diástole zero', 'Doppler', 'cardiotocografia'],
    relevancia_minima: 0.6,
    latencia_maxima_ms: 3000,
    justificativa: 'Fluxo diastólico ausente é marcador de comprometimento placentário relevante.',
  },
  {
    scenario_id: 'ciur',
    estagio: 4,
    fontes_esperadas: ['Ministério da Saúde'],
    termos_obrigatorios: ['fluxo reverso', 'parto', 'resolução'],
    relevancia_minima: 0.6,
    latencia_maxima_ms: 3000,
    justificativa: 'Doppler reverso deve recuperar conteúdo sobre alto risco fetal e momento da resolução.',
  },
];

function getEvaluationCriteria(scenarioId, stageNumber) {
  return evaluationCriteria.find((criteria) => (
    criteria.scenario_id === scenarioId && criteria.estagio === stageNumber
  )) || null;
}

module.exports = {
  evaluationCriteria,
  getEvaluationCriteria,
};
