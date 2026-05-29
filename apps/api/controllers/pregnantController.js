/**
 * Controlador responsável por gerenciar informações das gestantes.
 * Inclui funções para criação, listagem, consulta e atualização.
 *
 * Esta versão considera:
 * - req.user vindo do middleware JWT;
 * - roles padronizadas: gestante, medico, admin;
 * - tabela doctor_patient_links para vínculo médico-paciente.
 */

const client = require('../backend');
const logger = require('../utils/logger');

/**
 * Campos permitidos para atualização na tabela pregnants.
 * Isso evita que campos arbitrários vindos do req.body sejam usados no SQL.
 */
const ALLOWED_PREGNANT_UPDATE_FIELDS = [
  // Tela 3
  'altura',
  'peso_pregestacional',
  'peso_atual',
  'temperatura_materna',

  // Tela 5
  'antecedentes_diabetes',
  'antecedentes_hipertensao',
  'pressao_sistole',
  'pressao_diastole',

  // Tela 6
  'antecedentes_gemelar',
  'antecedentes_outros',
  'antecedentes_texto',

  // Tela 7
  'gestacao_partos',
  'gestacao_vaginal',
  'gestacao_cesarea',
  'gestacao_bebe_maior_45',
  'gestacao_bebe_maior_25',
  'gestacao_eclampsia_pre_eclampsia',
  'gestacao_gestas',
  'gestacao_abortos',
  'gestacao_mais_tres_abortos',
  'gestacao_nascidos_vivos',
  'gestacao_nascidos_mortos',
  'gestacao_vivem',
  'gestacao_mortos_primeira_semana',
  'gestacao_mortos_depois_primeira_semana',
  'gestacao_final_gestacao_anterior_1ano',

  // Tela 8
  'antecedentes_clinicos_diabetes',
  'antecedentes_clinicos_infeccao_urinaria',
  'antecedentes_clinicos_infertilidade',
  'antecedentes_clinicos_dific_amamentacao',
  'antecedentes_clinicos_cardiopatia',
  'antecedentes_clinicos_tromboembolismo',
  'antecedentes_clinicos_hipertensao_arterial',
  'antecedentes_clinicos_cirur_per_uterina',
  'antecedentes_clinicos_cirurgia',
  'antecedentes_clinicos_outros',
  'antecedentes_clinicos_outros_texto',

  // Tela 9
  'gestacao_atual_fumante',
  'gestacao_atual_quant_cigarros',
  'gestacao_atual_alcool',
  'gestacao_atual_outras_drogas',
  'gestacao_atual_hiv_aids',
  'gestacao_atual_sifilis',
  'gestacao_atual_toxoplasmose',
  'gestacao_atual_infeccao_urinaria',
  'gestacao_atual_anemia',
  'gestacao_atual_inc_istmocervical',
  'gestacao_atual_ameaca_parto_premat',
  'gestacao_atual_imuniz_rh',
  'gestacao_atual_oligo_polidramio',
  'gestacao_atual_rut_prem_membrana',
  'gestacao_atual_ciur',
  'gestacao_atual_pos_datismo',
  'gestacao_atual_febre',
  'gestacao_atual_hipertensao_arterial',
  'gestacao_atual_pre_eclamp_eclamp',
  'gestacao_atual_cardiopatia',
  'gestacao_atual_diabete_gestacional',
  'gestacao_atual_uso_insulina',
  'gestacao_atual_hemorragia_1trim',
  'gestacao_atual_hemorragia_2trim',
  'gestacao_atual_hemorragia_3trim',
  'exantema_rash',

  // Tela 10
  'vacina_antitetanica',
  'vacina_antitetanica_1dose',
  'vacina_antitetanica_2dose',
  'vacina_antitetanica_dtpa',
  'vacina_hepatite_b',
  'vacina_hepatite_b_1dose',
  'vacina_hepatite_b_2dose',
  'vacina_hepatite_b_3dose',
  'vacina_influenza',
  'vacina_influenza_1dose',
  'vacina_covid19',
  'vacina_covid19_1dose',
  'vacina_covid19_2dose',

  // Tela 12
  'info_gerais_edemas',
  'info_gerais_sintomas',
  'info_gerais_estado_geral_1',
  'info_gerais_estado_geral_2',
  'info_gerais_nutricional',
  'info_gerais_psicossocial',
];

function ensureAuthenticated(req, res) {
  if (!req.user) {
    res.status(401).json({ error: 'Usuário não autenticado' });
    return false;
  }

  return true;
}

async function doctorCanAccessPregnant(doctorId, pregnantId) {
  const result = await client.query(
    `
    SELECT 1
    FROM doctor_patient_links
    WHERE doctor_id = $1
      AND pregnant_id = $2
      AND status = 'active'
    LIMIT 1
    `,
    [doctorId, pregnantId]
  );

  return result.rows.length > 0;
}

async function findPregnantBasicById(id) {
  const result = await client.query(
    `
    SELECT id, user_id
    FROM pregnants
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function ensureCanAccessPregnant(req, res, pregnant) {
  if (!pregnant) {
    res.status(404).json({ error: 'Gestante não encontrada' });
    return false;
  }

  if (req.user.role === 'admin') {
    return true;
  }

  if (req.user.role === 'gestante') {
    if (pregnant.user_id !== req.user.id) {
      res.status(403).json({ error: 'Acesso negado' });
      return false;
    }

    return true;
  }

  if (req.user.role === 'medico') {
    const allowed = await doctorCanAccessPregnant(req.user.id, pregnant.id);

    if (!allowed) {
      res.status(403).json({ error: 'Médico não vinculado a esta gestante' });
      return false;
    }

    return true;
  }

  res.status(403).json({ error: 'Perfil de usuário não autorizado' });
  return false;
}

/**
 * Cria um novo registro de gestante vinculado ao usuário autenticado.
 *
 * Regra:
 * - gestante cria apenas o próprio registro;
 * - admin pode criar informando user_id no body, se necessário.
 */
const createPregnant = async (req, res) => {
  if (!ensureAuthenticated(req, res)) return;

  const userId =
    req.user.role === 'admin' && req.body.user_id
      ? req.body.user_id
      : req.user.id;

  try {
    const result = await client.query(
      `
      INSERT INTO pregnants (user_id)
      VALUES ($1)
      RETURNING *
      `,
      [userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar gestante:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Lista gestantes conforme o perfil:
 * - admin: todas;
 * - medico: apenas vinculadas ao médico;
 * - gestante: apenas o próprio registro.
 */
const getPregnants = async (req, res) => {
  if (!ensureAuthenticated(req, res)) return;

  try {
    let query;
    let params = [];

    const baseSelect = `
      SELECT 
        p.id AS pregnant_id,
        p.user_id,
        u.name AS patient_name,
        u.birthdate,
        (
          SELECT weeks 
          FROM pregnancies preg 
          WHERE preg.pregnant_id = p.id 
          ORDER BY preg.created_at DESC 
          LIMIT 1
        ) AS semanas_gestacao
      FROM pregnants p
      JOIN users u ON p.user_id = u.id
    `;

    if (req.user.role === 'admin') {
      query = `
        ${baseSelect}
        WHERE u.role = 'gestante'
        ORDER BY u.name ASC;
      `;
    } else if (req.user.role === 'medico') {
      query = `
        ${baseSelect}
        JOIN doctor_patient_links dpl ON dpl.pregnant_id = p.id
        WHERE u.role = 'gestante'
          AND dpl.doctor_id = $1
          AND dpl.status = 'active'
        ORDER BY u.name ASC;
      `;

      params = [req.user.id];
    } else if (req.user.role === 'gestante') {
      query = `
        ${baseSelect}
        WHERE u.role = 'gestante'
          AND p.user_id = $1
        ORDER BY u.name ASC;
      `;

      params = [req.user.id];
    } else {
      return res.status(403).json({ error: 'Perfil de usuário não autorizado' });
    }

    const result = await client.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar gestantes:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Atualiza os dados clínicos de uma gestante.
 *
 * Regra:
 * - medico pode atualizar apenas gestantes vinculadas;
 * - admin pode atualizar qualquer gestante;
 * - gestante não atualiza dados clínicos por esta rota.
 */
const updatePregnant = async (req, res) => {
  if (!ensureAuthenticated(req, res)) return;

  const { id } = req.params;

  try {
    if (req.user.role === 'gestante') {
      return res.status(403).json({
        error: 'Gestante não pode atualizar dados clínicos por esta rota',
      });
    }

    if (!['medico', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Perfil de usuário não autorizado' });
    }

    const pregnant = await findPregnantBasicById(id);
    const canAccess = await ensureCanAccessPregnant(req, res, pregnant);
    if (!canAccess) return;

    const entries = Object.entries(req.body).filter(([field, value]) => {
      return (
        ALLOWED_PREGNANT_UPDATE_FIELDS.includes(field) &&
        value !== undefined
      );
    });

    if (entries.length === 0) {
      return res.status(400).json({
        error: 'Nenhum campo válido para atualizar',
      });
    }

    const fields = entries.map(
      ([field], index) => `${field} = $${index + 1}`
    );

    const values = entries.map(([, value]) => value);

    values.push(id);

    const query = `
      UPDATE pregnants
      SET ${fields.join(', ')}
      WHERE id = $${values.length}
      RETURNING *;
    `;

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gestante não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Erro ao atualizar gestante', {
      details: err.message,
      pregnantId: id
    });
    res.status(500).json({ error: err.message });
  }
};

/**
 * Retorna uma gestante específica pelo ID.
 *
 * Inclui:
 * - dados da gestante;
 * - nome e nascimento da usuária;
 * - última gestação;
 * - lista de eventos/exames.
 */
const getPregnantById = async (req, res) => {
  if (!ensureAuthenticated(req, res)) return;

  const { id } = req.params;

  try {
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
            'dum', preg.dum,
            'dpp', preg.dpp
          )
          FROM pregnancies preg
          WHERE preg.pregnant_id = p.id
          ORDER BY preg.created_at DESC
          LIMIT 1
        ) AS latest_pregnancy,
        COALESCE(
          (
            SELECT json_agg(evt)
            FROM (
              SELECT pe.id, pe.descricao, pe.data_evento
              FROM pregnancy_events pe
              JOIN pregnancies preg ON pe.pregnancy_id = preg.id
              WHERE preg.pregnant_id = p.id
              ORDER BY pe.data_evento DESC
            ) AS evt
          ),
          '[]'::json
        ) AS all_events
      FROM pregnants p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1;
    `;

    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gestante não encontrada' });
    }

    const pregnant = result.rows[0];

    const canAccess = await ensureCanAccessPregnant(req, res, pregnant);
    if (!canAccess) return;

    res.json(pregnant);
  } catch (err) {
    console.error('Erro ao buscar gestante:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createPregnant,
  getPregnants,
  updatePregnant,
  getPregnantById,
};