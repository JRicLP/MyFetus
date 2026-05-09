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
        u.birthdate,
        (
          SELECT weeks 
          FROM pregnancies preg 
          WHERE preg.pregnant_id = p.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) AS semanas_gestacao
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

/*const updatePregnant = async (req, res) => {
  try {
    const updatedPregnant = await updateEntity('pregnants', req.params.id, req.body);
    if (!updatedPregnant) return res.status(404).send('Gestante não encontrada');
    res.json(updatedPregnant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};*/
/**
 * Função 3 
 * Atualiza os dados de uma gestante existente.

 */
const updatePregnant = async (req, res) => {
  const { id } = req.params;

  // Lista de todos os campos da Tabela 'pregnants' 
  const {
    // Tela 3
    altura,
    peso_pregestacional,
    peso_atual,
    temperatura_materna,
    // Tela 5
    antecedentes_diabetes,
    antecedentes_hipertensao,
    pressao_sistole,
    pressao_diastole,
    //Tela 6
    antecedentes_gemelar,
    antecedentes_outros,
    antecedentes_texto,

    // Tela 7 
    gestacao_partos,
    gestacao_vaginal,
    gestacao_cesarea,
    gestacao_bebe_maior_45,
    gestacao_bebe_maior_25,
    gestacao_eclampsia_pre_eclampsia,
    gestacao_gestas,
    gestacao_abortos,
    gestacao_mais_tres_abortos,
    gestacao_nascidos_vivos,
    gestacao_nascidos_mortos,
    gestacao_vivem,
    gestacao_mortos_primeira_semana,
    gestacao_mortos_depois_primeira_semana,
    gestacao_final_gestacao_anterior_1ano,

    //Tela 8
    antecedentes_clinicos_diabetes,
    antecedentes_clinicos_infeccao_urinaria,
    antecedentes_clinicos_infertilidade,
    antecedentes_clinicos_dific_amamentacao,
    antecedentes_clinicos_cardiopatia,
    antecedentes_clinicos_tromboembolismo,
    antecedentes_clinicos_hipertensao_arterial,
    antecedentes_clinicos_cirur_per_uterina,
    antecedentes_clinicos_cirurgia,
    antecedentes_clinicos_outros,
    antecedentes_clinicos_outros_texto,
    // Tela 9 
    gestacao_atual_fumante, gestacao_atual_quant_cigarros, gestacao_atual_alcool,
    gestacao_atual_outras_drogas, 
    gestacao_atual_hiv_aids, 
    gestacao_atual_sifilis,
    gestacao_atual_toxoplasmose, gestacao_atual_infeccao_urinaria, gestacao_atual_anemia,
    gestacao_atual_inc_istmocervical, 
    gestacao_atual_ameaca_parto_premat, 
    gestacao_atual_imuniz_rh, 
    gestacao_atual_oligo_polidramio, 
    gestacao_atual_rut_prem_membrana, 
    gestacao_atual_ciur, gestacao_atual_pos_datismo,
    gestacao_atual_febre, 
    gestacao_atual_hipertensao_arterial, 
    gestacao_atual_pre_eclamp_eclamp, 
    gestacao_atual_cardiopatia,
    gestacao_atual_diabete_gestacional, gestacao_atual_uso_insulina,
    gestacao_atual_hemorragia_1trim, 
    gestacao_atual_hemorragia_2trim, 
    gestacao_atual_hemorragia_3trim, 
    exantema_rash, 
    // Tela 10 (Vacinas)
    vacina_antitetanica, vacina_antitetanica_1dose, vacina_antitetanica_2dose, vacina_antitetanica_dtpa,
    vacina_hepatite_b, vacina_hepatite_b_1dose, vacina_hepatite_b_2dose, vacina_hepatite_b_3dose,
    vacina_influenza, vacina_influenza_1dose,
    vacina_covid19, vacina_covid19_1dose, vacina_covid19_2dose,
    // Tela 12
    info_gerais_edemas,
    info_gerais_sintomas,
    info_gerais_estado_geral_1,
    info_gerais_estado_geral_2,
    info_gerais_nutricional,
    info_gerais_psicossocial
    
  } = req.body;

  const fields = [];
  const values = [];
  let paramCount = 1;

  const addField = (name, value) => {
    if (value !== undefined) {
      fields.push(`${name} = $${paramCount++}`);
      values.push(value);
    }
  };


// Tela 3 e 5
  addField('altura', altura);
  addField('peso_pregestacional', peso_pregestacional);
  addField('peso_atual', peso_atual);
  addField('temperatura_materna', temperatura_materna);
  addField('pressao_sistole', pressao_sistole);
  addField('pressao_diastole', pressao_diastole);

  // Tela 6
  addField('antecedentes_diabetes', antecedentes_diabetes);
  addField('antecedentes_hipertensao', antecedentes_hipertensao);
  addField('antecedentes_gemelar', antecedentes_gemelar);
  addField('antecedentes_outros', antecedentes_outros);
  addField('antecedentes_texto', antecedentes_texto);

  // Tela 7
  addField('gestacao_partos', gestacao_partos);
  addField('gestacao_vaginal', gestacao_vaginal);
  addField('gestacao_cesarea', gestacao_cesarea);
  addField('gestacao_bebe_maior_45', gestacao_bebe_maior_45);
  addField('gestacao_bebe_maior_25', gestacao_bebe_maior_25);
  addField('gestacao_eclampsia_pre_eclampsia', gestacao_eclampsia_pre_eclampsia);
  addField('gestacao_gestas', gestacao_gestas);
  addField('gestacao_abortos', gestacao_abortos);
  addField('gestacao_mais_tres_abortos', gestacao_mais_tres_abortos);
  addField('gestacao_nascidos_vivos', gestacao_nascidos_vivos);
  addField('gestacao_nascidos_mortos', gestacao_nascidos_mortos);
  addField('gestacao_vivem', gestacao_vivem);
  addField('gestacao_mortos_primeira_semana', gestacao_mortos_primeira_semana);
  addField('gestacao_mortos_depois_primeira_semana', gestacao_mortos_depois_primeira_semana);
  addField('gestacao_final_gestacao_anterior_1ano', gestacao_final_gestacao_anterior_1ano);
  // Tela 8
  addField('antecedentes_clinicos_diabetes', antecedentes_clinicos_diabetes);
  addField('antecedentes_clinicos_infeccao_urinaria', antecedentes_clinicos_infeccao_urinaria);
  addField('antecedentes_clinicos_infertilidade', antecedentes_clinicos_infertilidade);
  addField('antecedentes_clinicos_dific_amamentacao', antecedentes_clinicos_dific_amamentacao);
  addField('antecedentes_clinicos_cardiopatia', antecedentes_clinicos_cardiopatia);
  addField('antecedentes_clinicos_tromboembolismo', antecedentes_clinicos_tromboembolismo);
  addField('antecedentes_clinicos_hipertensao_arterial', antecedentes_clinicos_hipertensao_arterial);
  addField('antecedentes_clinicos_cirur_per_uterina', antecedentes_clinicos_cirur_per_uterina);
  addField('antecedentes_clinicos_cirurgia', antecedentes_clinicos_cirurgia);
  addField('antecedentes_clinicos_outros', antecedentes_clinicos_outros);
  addField('antecedentes_clinicos_outros_texto', antecedentes_clinicos_outros_texto);
  // Tela 9 
  addField('gestacao_atual_fumante', gestacao_atual_fumante);
  addField('gestacao_atual_quant_cigarros', gestacao_atual_quant_cigarros);
  addField('gestacao_atual_alcool', gestacao_atual_alcool);
  addField('gestacao_atual_outras_drogas', gestacao_atual_outras_drogas);
  addField('gestacao_atual_hiv_aids', gestacao_atual_hiv_aids);
  addField('gestacao_atual_sifilis', gestacao_atual_sifilis);
  addField('gestacao_atual_toxoplasmose', gestacao_atual_toxoplasmose);
  addField('gestacao_atual_infeccao_urinaria', gestacao_atual_infeccao_urinaria);
  addField('gestacao_atual_anemia', gestacao_atual_anemia);
  addField('gestacao_atual_inc_istmocervical', gestacao_atual_inc_istmocervical); 
  addField('gestacao_atual_ameaca_parto_premat', gestacao_atual_ameaca_parto_premat); 
  addField('gestacao_atual_imuniz_rh', gestacao_atual_imuniz_rh); 
  addField('gestacao_atual_oligo_polidramio', gestacao_atual_oligo_polidramio); 
  addField('gestacao_atual_rut_prem_membrana', gestacao_atual_rut_prem_membrana); 
  addField('gestacao_atual_ciur', gestacao_atual_ciur);
  addField('gestacao_atual_pos_datismo', gestacao_atual_pos_datismo);
  addField('gestacao_atual_febre', gestacao_atual_febre);
  addField('gestacao_atual_hipertensao_arterial', gestacao_atual_hipertensao_arterial); 
  addField('gestacao_atual_pre_eclamp_eclamp', gestacao_atual_pre_eclamp_eclamp); 
  addField('gestacao_atual_cardiopatia', gestacao_atual_cardiopatia);
  addField('gestacao_atual_diabete_gestacional', gestacao_atual_diabete_gestacional);
  addField('gestacao_atual_uso_insulina', gestacao_atual_uso_insulina);
  addField('gestacao_atual_hemorragia_1trim', gestacao_atual_hemorragia_1trim); 
  addField('gestacao_atual_hemorragia_2trim', gestacao_atual_hemorragia_2trim); 
  addField('gestacao_atual_hemorragia_3trim', gestacao_atual_hemorragia_3trim);
  addField('exantema_rash', exantema_rash); 
  // Tela 10 (Vacinas)
  addField('vacina_antitetanica', vacina_antitetanica);
  addField('vacina_antitetanica_1dose', vacina_antitetanica_1dose);
  addField('vacina_antitetanica_2dose', vacina_antitetanica_2dose);
  addField('vacina_antitetanica_dtpa', vacina_antitetanica_dtpa);
  addField('vacina_hepatite_b', vacina_hepatite_b);
  addField('vacina_hepatite_b_1dose', vacina_hepatite_b_1dose);
  addField('vacina_hepatite_b_2dose', vacina_hepatite_b_2dose);
  addField('vacina_hepatite_b_3dose', vacina_hepatite_b_3dose);
  addField('vacina_influenza', vacina_influenza);
  addField('vacina_influenza_1dose', vacina_influenza_1dose);
  addField('vacina_covid19', vacina_covid19);
  addField('vacina_covid19_1dose', vacina_covid19_1dose);
  addField('vacina_covid19_2dose', vacina_covid19_2dose);
  // Tela 12
  addField('info_gerais_edemas', info_gerais_edemas);
  addField('info_gerais_sintomas', info_gerais_sintomas);
  addField('info_gerais_estado_geral_1', info_gerais_estado_geral_1);
  addField('info_gerais_estado_geral_2', info_gerais_estado_geral_2);
  addField('info_gerais_nutricional', info_gerais_nutricional);
  addField('info_gerais_psicossocial', info_gerais_psicossocial);
 

  if (fields.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  values.push(id); // O último parâmetro é o ID

  const query = `
    UPDATE pregnants 
    SET ${fields.join(', ')} 
    WHERE id = $${paramCount} 
    RETURNING *;
  `;

  try {
    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).send('Gestante não encontrada');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
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