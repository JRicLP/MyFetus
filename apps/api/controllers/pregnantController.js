/**
 * Controlador responsável por gerenciar informações das gestantes.
 * Inclui funções para criação, listagem e atualização de registros de gestantes.
 */
const client = require('../backend');
const updateEntity = require('../utils/updateEntity');

/**
 * Função 1
 * Cria um novo registro de gestante vinculado a um usuário.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `body.user_id` (ID do usuário associado).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Registro da gestante criado.
 */
const createPregnant = async (req, res) => {
  const { user_id } = req.body;
  try {
    const result = await client.query(
      'INSERT INTO pregnants (user_id) VALUES ($1) RETURNING *',
      [user_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 2
 * Retorna todas as gestantes cadastradas.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição HTTP.
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Lista de gestantes existentes no banco de dados.
 */
const getPregnants = async (req, res) => {
  try {
    // MUDANÇA: Fazer um JOIN para buscar o nome do usuário
    const query = `
      SELECT 
        p.id AS pregnant_id,
        p.user_id,
        u.name AS patient_name,
        u.birth_date,
        (
          SELECT gestational_age_weeks 
          FROM pregnancies preg 
          WHERE preg.pregnant_id = p.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) AS gestational_age_weeks
      FROM pregnants p
      JOIN users u ON p.user_id = u.id
      WHERE u.role = 'user';
    `;
    // O "WHERE users.role = 'user'" garante que não vamos listar
    // outros médicos (admins) como se fossem pacientes.

    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 3
 * Atualiza os dados de uma gestante existente.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `params.id` (ID da gestante) e `body` (campos a atualizar).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Registro atualizado da gestante.
 */

const updatePregnant = async (req, res) => {
  const { id } = req.params;

  // Mapeia os nomes do frontend para os nomes do banco de dados
  const columnMapping = {
    altura: 'height',
    peso_pre_gestacional: 'pre_pregnancy_weight',
    peso_atual: 'current_weight',
    temperatura_materna: 'maternal_temperature',
    antecedentes_diabetes: 'has_diabetes_history',
    antecedentes_hipertensao: 'has_hypertension_history',
    antecedentes_gemelar: 'has_twin_pregnancy_history',
    antecedentes_outros: 'has_other_history',
    antecedentes_outros_texto: 'other_history_description',
    gestacao_partos: 'previous_births',
    gestacao_vaginal: 'vaginal_births',
    gestacao_cesarea: 'cesarean_births',
    gestacao_bebe_maior_45: 'had_baby_over_4_5kg',
    gestacao_bebe_maior_25: 'had_baby_under_2_5kg',
    gestacao_eclampsia: 'had_eclampsia',
    gestacao_gestas: 'is_multiparous',
    gestacao_abortos: 'abortions',
    gestacao_mais_tres_abortos: 'had_three_or_more_abortions',
    gestacao_nascidos_vivos: 'live_births',
    gestacao_nascidos_mortos: 'stillbirths',
    gestacao_vivem: 'children_alive',
    gestacao_mortos_primeira_semana: 'deaths_first_week',
    gestacao_mortos_depois_primeira_semana: 'deaths_after_first_week',
    gestacao_final_anterior_um_ano: 'last_pregnancy_ended_less_than_a_year_ago',
    antecedentes_clinicos_diabetes: 'has_clinical_diabetes_history',
    antecedentes_clinicos_infeccao_urinaria: 'has_urinary_tract_infection_history',
    antecedentes_clinicos_infertilidade: 'has_infertility_history',
    antecedentes_clinicos_dific_amamentacao: 'has_breastfeeding_difficulty_history',
    antecedentes_clinicos_cardiopatia: 'has_cardiopathy_history',
    antecedentes_clinicos_tromboembolismo: 'has_thromboembolism_history',
    antecedentes_clinicos_hipertensao: 'has_clinical_hypertension_history',
    antecedentes_clinicos_cirur_per_uterina: 'has_uterine_surgery_history',
    antecedentes_clinicos_cirurgia: 'has_surgery_history',
    antecedentes_clinicos_outros: 'has_other_clinical_history',
    antecedentes_clinicos_outros_texto: 'other_clinical_history_description',
    gestacao_atual_fumante: 'is_smoker',
    gestacao_atual_qtd_cigarros: 'cigarettes_per_day',
    gestacao_atual_alcool: 'consumes_alcohol',
    gestacao_atual_outras_drogas: 'uses_other_drugs',
    gestacao_atual_hiv: 'is_hiv_positive',
    gestacao_atual_sifilis: 'has_syphilis',
    gestacao_atual_toxoplasmose: 'has_toxoplasmosis',
    gestacao_atual_infeccao_urinaria: 'has_urinary_tract_infection',
    gestacao_atual_anemia: 'has_anemia',
    gestacao_atual_insuficiencia_istmocervical: 'has_isthmic_cervical_insufficiency',
    gestacao_atual_ameaca_parto_prematuro: 'has_threatened_preterm_labor',
    gestacao_atual_imunizacao_rh: 'has_rh_immunization',
    gestacao_atual_oligo_polidramnio: 'has_oligohydramnios_polyhydramnios',
    gestacao_atual_ruptura_prematura_membranas: 'has_premature_rupture_of_membranes',
    gestacao_atual_ciur: 'has_iugr',
    gestacao_atual_pos_datismo: 'is_post_term',
    gestacao_atual_febre: 'has_fever',
    gestacao_atual_hipertensao: 'has_hypertension',
    gestacao_atual_pre_eclampsia: 'has_preeclampsia',
    gestacao_atual_cardiopatia: 'has_cardiopathy',
    gestacao_atual_diabete_gestacional: 'has_gestational_diabetes',
    gestacao_atual_uso_insulina: 'uses_insulin',
    gestacao_atual_hemorragia_1tri: 'had_first_trimester_bleeding',
    gestacao_atual_hemorragia_2tri: 'had_second_trimester_bleeding',
    gestacao_atual_hemorragia_3tri: 'had_third_trimester_bleeding',
    gestacao_atual_exantema: 'has_exanthema',
    vacinas_antitetanica: 'tetanus_vaccine_doses',
    vacinas_antitetanica_1dose: 'tetanus_vaccine_dose1_date',
    vacinas_antitetanica_2dose: 'tetanus_vaccine_dose2_date',
    vacinas_antitetanica_dtpa: 'tetanus_vaccine_dtpa_date',
    vacinas_hepatiteb: 'has_hepatitis_b_vaccine',
    vacinas_hepatiteb_1dose: 'hepatitis_b_vaccine_dose1_date',
    vacinas_hepatiteb_2dose: 'hepatitis_b_vaccine_dose2_date',
    vacinas_hepatiteb_3dose: 'hepatitis_b_vaccine_dose3_date',
    vacinas_influenza: 'has_influenza_vaccine',
    vacinas_influenza_1dose: 'influenza_vaccine_dose1_date',
    vacinas_covid: 'has_covid_vaccine',
    vacinas_covid_1dose: 'covid_vaccine_dose1_date',
    vacinas_covid_2dose: 'covid_vaccine_dose2_date'
  };

  const updates = {};
  for (const key in req.body) {
    if (columnMapping[key]) {
      updates[columnMapping[key]] = req.body[key];
    }
  }

  try {
    const updatedPregnant = await updateEntity('pregnants', id, updates);
    if (!updatedPregnant) return res.status(404).send('Gestante não encontrada');
    res.json(updatedPregnant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 

/**
 * Função 
 * Retorna uma gestante específica pelo ID,
 * incluindo o nome e data de nascimento (da tabela 'users').
 */
/**
 * Função (AGORA FINALÍSSIMA)
 * Retorna uma gestante específica pelo ID,
 * incluindo o nome, dados da última gestação E a lista de todos os exames.
 */
const getPregnantById = async (req, res) => {
  const { id } = req.params; // Este é o pregnant_id

  try {
    // Esta query agora busca o 'latest_pregnancy' (com dpp/dum)
    // E também busca 'all_events' (um array JSON de todos os exames)
    const query = `
      SELECT 
        u.name AS patient_name,
        u.birthdate,
        p.*, 
        (
          SELECT json_build_object(
            'id', preg.id, 
            'glicemia', preg.glicemia, 
            'weeks', preg.weeks,
            'frequencia_cardiaca', preg.frequencia_cardiaca,
            'altura_uterina', preg.altura_uterina,
            'dum', preg.dum, -- 
            'dpp', preg.dpp  -- 
          )
          FROM pregnancies preg
          WHERE preg.pregnant_id = p.id
          ORDER BY preg.created_at DESC
          LIMIT 1
        ) AS latest_pregnancy,
        (
          SELECT json_agg(evt)
          FROM (
            SELECT pe.id, pe.descricao, pe.data_evento
            FROM pregnancy_events pe
            JOIN pregnancies preg ON pe.pregnancy_id = preg.id
            WHERE preg.pregnant_id = p.id
            ORDER BY pe.data_evento DESC
          ) AS evt
        ) AS all_events -- 

      FROM pregnants p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1;
    `;

    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gestante não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createPregnant,
  getPregnants,
  updatePregnant,
  getPregnantById 
};