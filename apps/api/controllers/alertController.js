const client = require('../backend');
const logger = require('../utils/logger');
const { audit } = require('../services/auditService');

const TRAFFIC = { GREEN: 'green', YELLOW: 'yellow', RED: 'red' };

function calcularIdade(birthdate) {
  if (!birthdate) return 0;
  const hoje = new Date();
  const nasc = new Date(birthdate);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

function idadeAlert(idade) {
  if (idade <= 15) return { level: TRAFFIC.RED, label: 'Idade <= 15 anos', detail: `Paciente tem ${idade} anos (extremo risco)` };
  if (idade >= 40) return { level: TRAFFIC.RED, label: 'Idade >= 40 anos', detail: `Paciente tem ${idade} anos (alto risco)` };
  if (idade >= 35) return { level: TRAFFIC.YELLOW, label: 'Idade >= 35 anos', detail: `Paciente tem ${idade} anos (risco moderado)` };
  return { level: TRAFFIC.GREEN, label: 'Idade adequada', detail: `${idade} anos` };
}

function paAlert(sistole, diastole) {
  if (!sistole || !diastole) return null;
  if (sistole >= 160 || diastole >= 110) return { level: TRAFFIC.RED, label: 'CrHipertensiva', detail: `PA ${sistole}/${diastole} mmHg (emergência hipertensiva)` };
  if (sistole >= 140 || diastole >= 90) return { level: TRAFFIC.YELLOW, label: 'Hipertensão', detail: `PA ${sistole}/${diastole} mmHg (hipertensão)` };
  if (sistole >= 130 || diastole >= 85) return { level: TRAFFIC.YELLOW, label: 'Pré-hipertensão', detail: `PA ${sistole}/${diastole} mmHg (pré-hipertensão)` };
  return { level: TRAFFIC.GREEN, label: 'PA normal', detail: `PA ${sistole}/${diastole} mmHg` };
}

function glicemiaAlert(glicemia) {
  if (!glicemia || glicemia === 0) return null;
  if (glicemia > 200) return { level: TRAFFIC.RED, label: 'Glicemia crítica', detail: `${glicemia} mg/dL (hiperglicemia severa)` };
  if (glicemia >= 126) return { level: TRAFFIC.YELLOW, label: 'Glicemia alta', detail: `${glicemia} mg/dL (diabetes)` };
  if (glicemia >= 92) return { level: TRAFFIC.YELLOW, label: 'Glicemia alterada', detail: `${glicemia} mg/dL (pré-diabetes)` };
  return { level: TRAFFIC.GREEN, label: 'Glicemia normal', detail: `${glicemia} mg/dL` };
}

function imcAlert(peso, altura) {
  if (!peso || !altura) return null;
  const imc = peso / (altura * altura);
  if (imc >= 40) return { level: TRAFFIC.RED, label: 'Obesidade mórbida', detail: `IMC ${imc.toFixed(1)} kg/m² (risco extremo)` };
  if (imc >= 30) return { level: TRAFFIC.YELLOW, label: 'Obesidade', detail: `IMC ${imc.toFixed(1)} kg/m²` };
  if (imc < 18.5) return { level: TRAFFIC.YELLOW, label: 'Abaixo do peso', detail: `IMC ${imc.toFixed(1)} kg/m²` };
  if (imc >= 25) return { level: TRAFFIC.YELLOW, label: 'Sobrepeso', detail: `IMC ${imc.toFixed(1)} kg/m²` };
  return { level: TRAFFIC.GREEN, label: 'IMC normal', detail: `IMC ${imc.toFixed(1)} kg/m²` };
}

function pesoFetalAlert(altura_uterina, weeks) {
  if (!altura_uterina || !weeks) return null;
  if (altura_uterina < weeks - 3) return { level: TRAFFIC.YELLOW, label: 'AU baixa', detail: `Altura uterina ${altura_uterina} cm para ${weeks} sem (possível CIUR)` };
  if (altura_uterina > weeks + 3) return { level: TRAFFIC.YELLOW, label: 'AU elevada', detail: `Altura uterina ${altura_uterina} cm para ${weeks} sem (possível polidrâmnio/gemelar)` };
  return { level: TRAFFIC.GREEN, label: 'AU adequada', detail: `${altura_uterina} cm para ${weeks} semanas` };
}

function fcFetalAlert(fc) {
  if (!fc || fc === 0) return null;
  if (fc < 110) return { level: TRAFFIC.RED, label: 'Bradicardia fetal', detail: `FC ${fc} bpm (< 110 bpm)` };
  if (fc > 160) return { level: TRAFFIC.YELLOW, label: 'Taquicardia fetal', detail: `FC ${fc} bpm (> 160 bpm)` };
  return { level: TRAFFIC.GREEN, label: 'FC fetal normal', detail: `${fc} bpm` };
}

function buildAntecedentesFamiliaresAlert(p) {
  const ativos = [];
  if (p.antecedentes_diabetes) ativos.push('Diabetes');
  if (p.antecedentes_hipertensao) ativos.push('Hipertensão');
  if (p.antecedentes_gemelar) ativos.push('Gemelar');
  if (p.antecedentes_outros) ativos.push(p.antecedentes_texto || 'Outros');
  if (ativos.length === 0) return { level: TRAFFIC.GREEN, label: 'Sem antecedentes familiares', detail: 'Nenhum registro' };
  return { level: TRAFFIC.YELLOW, label: `Antecedentes: ${ativos.join(', ')}`, detail: ativos.join(', ') };
}

function buildAntecedentesClinicosAlert(p) {
  const vermelho = [];
  const amarelo = [];
  if (p.antecedentes_clinicos_cardiopatia) vermelho.push('Cardiopatia');
  if (p.antecedentes_clinicos_hipertensao_arterial) amarelo.push('Hipertensão arterial');
  if (p.antecedentes_clinicos_diabetes) amarelo.push('Diabetes');
  if (p.antecedentes_clinicos_tromboembolismo) vermelho.push('Tromboembolismo');
  if (p.antecedentes_clinicos_cirur_per_uterina) amarelo.push('Cirurgia periuterina');
  if (p.antecedentes_clinicos_infeccao_urinaria) amarelo.push('Infecção urinária');
  if (p.antecedentes_clinicos_infertilidade) amarelo.push('Infertilidade');
  if (p.antecedentes_clinicos_dific_amamentacao) amarelo.push('Dificuldade amamentação');
  if (p.antecedentes_clinicos_cirurgia) amarelo.push('Cirurgia prévia');
  if (p.antecedentes_clinicos_outros) amarelo.push(p.antecedentes_clinicos_outros_texto || 'Outros');
  const all = [...vermelho, ...amarelo];
  if (all.length === 0) return { level: TRAFFIC.GREEN, label: 'Sem antecedentes clínicos', detail: 'Nenhum registro' };
  const level = vermelho.length > 0 ? TRAFFIC.RED : TRAFFIC.YELLOW;
  return { level, label: all.join(', '), detail: all.join(', ') };
}

function buildGestacaoAnteriorAlert(p) {
  const vermelho = [];
  const amarelo = [];
  if (p.gestacao_eclampsia_pre_eclampsia) vermelho.push('Pré-eclâmpsia/Eclâmpsia');
  if (p.gestacao_bebe_maior_45) amarelo.push('Bebê > 4.5kg');
  if (p.gestacao_mais_tres_abortos) amarelo.push('> 3 abortos');
  if (p.gestacao_nascidos_mortos > 0) vermelho.push(`Natimorto(s): ${p.gestacao_nascidos_mortos}`);
  if (p.gestacao_mortos_primeira_semana > 0) vermelho.push(`Morte neonatal precoce: ${p.gestacao_mortos_primeira_semana}`);
  if (p.gestacao_mortos_depois_primeira_semana > 0) vermelho.push(`Morte neonatal tardia: ${p.gestacao_mortos_depois_primeira_semana}`);
  if (p.gestacao_final_gestacao_anterior_1ano) amarelo.push('Gestação anterior < 1 ano');
  const all = [...vermelho, ...amarelo];
  if (all.length === 0) return { level: TRAFFIC.GREEN, label: 'Sem complicações anteriores', detail: 'Nenhum registro' };
  const level = vermelho.length > 0 ? TRAFFIC.RED : TRAFFIC.YELLOW;
  return { level, label: all.join(', '), detail: all.join(', ') };
}

function buildGestacaoAtualAlert(p) {
  const vermelho = [];
  const amarelo = [];
  if (p.gestacao_atual_hiv_aids) vermelho.push('HIV/AIDS');
  if (p.gestacao_atual_sifilis) vermelho.push('Sífilis');
  if (p.gestacao_atual_pre_eclamp_eclamp) vermelho.push('Pré-eclâmpsia/Eclâmpsia');
  if (p.gestacao_atual_cardiopatia) vermelho.push('Cardiopatia');
  if (p.gestacao_atual_hemorragia_1trim) vermelho.push('Hemorragia 1º trimestre');
  if (p.gestacao_atual_hemorragia_2trim) vermelho.push('Hemorragia 2º trimestre');
  if (p.gestacao_atual_hemorragia_3trim) vermelho.push('Hemorragia 3º trimestre');
  if (p.gestacao_atual_hipertensao_arterial) amarelo.push('Hipertensão arterial');
  if (p.gestacao_atual_diabete_gestacional) amarelo.push('Diabetes gestacional');
  if (p.gestacao_atual_uso_insulina) amarelo.push('Uso de insulina');
  if (p.gestacao_atual_anemia) amarelo.push('Anemia');
  if (p.gestacao_atual_infeccao_urinaria) amarelo.push('Infecção urinária');
  if (p.gestacao_atual_toxoplasmose) amarelo.push('Toxoplasmose');
  if (p.gestacao_atual_fumante) amarelo.push(`Tabagista (${p.gestacao_atual_quant_cigarros || '?'} cigarros/dia)`);
  if (p.gestacao_atual_alcool) amarelo.push('Consumo de álcool');
  if (p.gestacao_atual_outras_drogas) vermelho.push('Uso de outras drogas');
  if (p.gestacao_atual_ameaca_parto_premat) vermelho.push('Ameaça de parto prematuro');
  if (p.gestacao_atual_ciur) vermelho.push('CIUR');
  if (p.gestacao_atual_oligo_polidramio) amarelo.push('Oligo/Polidrâmnio');
  if (p.gestacao_atual_rut_prem_membrana) vermelho.push('Ruptura prematura de membranas');
  if (p.gestacao_atual_inc_istmocervical) vermelho.push('Incompetência istmocervical');
  if (p.gestacao_atual_imuniz_rh) amarelo.push('Imunização Rh');
  if (p.gestacao_atual_pos_datismo) amarelo.push('Pós-datismo');
  if (p.gestacao_atual_febre) amarelo.push('Febre');
  if (p.exantema_rash) amarelo.push('Exantema/Rash');
  const all = [...vermelho, ...amarelo];
  if (all.length === 0) return { level: TRAFFIC.GREEN, label: 'Gestação atual sem riscos', detail: 'Nenhum registro' };
  const level = vermelho.length > 0 ? TRAFFIC.RED : TRAFFIC.YELLOW;
  return { level, label: all.join(', '), detail: all.join(', ') };
}

function buildSemanasAlert(weeks) {
  if (!weeks) return null;
  if (weeks >= 42) return { level: TRAFFIC.RED, label: 'Gestação prolongada', detail: `${weeks} semanas (pós-datismo severo)` };
  if (weeks >= 41) return { level: TRAFFIC.YELLOW, label: 'Pós-datismo', detail: `${weeks} semanas` };
  if (weeks <= 36) return { level: TRAFFIC.YELLOW, label: 'Gestação < 37 semanas', detail: `${weeks} semanas (possível parto prematuro)` };
  if (weeks <= 6) return { level: TRAFFIC.YELLOW, label: 'Início da gestação', detail: `${weeks} semanas` };
  return { level: TRAFFIC.GREEN, label: 'Idade gestacional adequada', detail: `${weeks} semanas` };
}

function buildVacinasAlert(p) {
  const pendentes = [];
  if (!p.vacina_antitetanica) pendentes.push('Antitetânica');
  if (!p.vacina_hepatite_b) pendentes.push('Hepatite B');
  if (!p.vacina_influenza) pendentes.push('Influenza');
  if (!p.vacina_covid19) pendentes.push('COVID-19');
  if (pendentes.length === 0) return { level: TRAFFIC.GREEN, label: 'Vacinas em dia', detail: 'Todas as vacinas registradas' };
  const count = pendentes.length;
  if (count >= 3) return { level: TRAFFIC.RED, label: `${count} vacinas pendentes`, detail: pendentes.join(', ') };
  return { level: TRAFFIC.YELLOW, label: `${count} vacina(s) pendente(s)`, detail: pendentes.join(', ') };
}

const getPatientAlerts = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query(
      `SELECT
        u.name AS patient_name,
        u.birthdate,
        p.*,
        (
          SELECT json_build_object(
            'id', preg.id,
            'weeks', preg.weeks,
            'glicemia', preg.glicemia,
            'frequencia_cardiaca', preg.frequencia_cardiaca,
            'altura_uterina', preg.altura_uterina,
            'dum', preg.dum,
            'dpp', preg.dpp
          )
          FROM pregnancies preg
          WHERE preg.pregnant_id = p.id
          ORDER BY preg.created_at DESC
          LIMIT 1
        ) AS latest_pregnancy
      FROM pregnants p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gestante não encontrada' });
    }

    const p = result.rows[0];
    const idade = calcularIdade(p.birthdate);
    const weeks = p.latest_pregnancy?.weeks || null;

    const categories = {
      idade_materna: idadeAlert(idade),
      pressao_arterial: paAlert(p.pressao_sistole, p.pressao_diastole),
      glicemia: glicemiaAlert(p.latest_pregnancy?.glicemia),
      imc: imcAlert(p.peso_pregestacional, p.altura),
      altura_uterina: pesoFetalAlert(p.latest_pregnancy?.altura_uterina, weeks),
      frequencia_cardiaca_fetal: fcFetalAlert(p.latest_pregnancy?.frequencia_cardiaca),
      semanas_gestacao: buildSemanasAlert(weeks),
      antecedentes_familiares: buildAntecedentesFamiliaresAlert(p),
      antecedentes_clinicos: buildAntecedentesClinicosAlert(p),
      gestacao_anterior: buildGestacaoAnteriorAlert(p),
      gestacao_atual: buildGestacaoAtualAlert(p),
      vacinas: buildVacinasAlert(p),
    };

    const levelValues = { green: 0, yellow: 1, red: 2 };
    const overallLevel = Object.values(categories)
      .filter(Boolean)
      .reduce((worst, cat) => {
        return levelValues[cat.level] > levelValues[worst] ? cat.level : worst;
      }, TRAFFIC.GREEN);

    const alertCounts = { green: 0, yellow: 0, red: 0 };
    Object.values(categories).filter(Boolean).forEach(cat => alertCounts[cat.level]++);

    audit(req, {
      action: 'ALERT_ACCESSED',
      resource: 'alerts',
      resource_id: id,
      outcome: 'SUCCESS',
      detail: { overall_level: overallLevel, alert_counts: alertCounts },
    });

    res.json({
      patient_id: id,
      patient_name: p.patient_name,
      overall_level: overallLevel,
      alert_counts: alertCounts,
      categories,
    });
  } catch (err) {
    logger.error('Erro ao gerar alertas', { details: err.message, pregnantId: id });
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getPatientAlerts };
