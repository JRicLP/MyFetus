/**
 * Controlador responsável por gerenciar informações de gestações.
 * Inclui funções para criação, listagem, atualização e cálculo de DPP (Data Provável do Parto).
  */
const client = require('../backend');
const updateEntity = require('../utils/updateEntity');

/**
 * Função 1
 * Cria um novo registro de gestação associado a uma gestante.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `body` com os campos da gestação (pregnant_id, weeks, dum, dpp, ccn, dgm, glicemia, regularidade_do_ciclo, ig_ultrassonografia).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Registro de gestação criado.
 */
const createPregnancy = async (req, res) => {
  const { 
    pregnant_id, 
    gestational_age_weeks, 
    is_checked = false, 
    last_menstrual_period_date, 
    expected_delivery_date, 
    crown_rump_length = 0.0, 
    mean_gestational_sac_diameter = 0.0, 
    blood_glucose_level = 0, 
    heart_rate = 0, 
    uterine_height=0.0, 
    has_regular_cycle = true, 
    ultrasound_gestational_age_date 
  } = req.body;

  if (!last_menstrual_period_date || !expected_delivery_date || !ultrasound_gestational_age_date) {
    return res.status(400).json({ error: 'Campos last_menstrual_period_date, expected_delivery_date e ultrasound_gestational_age_date são obrigatórios' });
  }
  try {
    const result = await client.query(
      `INSERT INTO pregnancies (
        pregnant_id, gestational_age_weeks, is_checked, last_menstrual_period_date, 
        expected_delivery_date, crown_rump_length, mean_gestational_sac_diameter, 
        blood_glucose_level, heart_rate, uterine_height, has_regular_cycle, 
        ultrasound_gestational_age_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        pregnant_id, gestational_age_weeks, is_checked, last_menstrual_period_date, 
        expected_delivery_date, crown_rump_length, mean_gestational_sac_diameter, 
        blood_glucose_level, heart_rate, uterine_height, has_regular_cycle, 
        ultrasound_gestational_age_date
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 2
 * Retorna todas as gestações cadastradas.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição HTTP.
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Lista de gestações existentes no banco de dados.
 */
const getPregnancies = async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM pregnancies');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * Função 3
 * Atualiza os dados de uma gestação existente.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `params.id` (ID da gestação) e `body` (campos a atualizar).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Registro atualizado da gestação.
 */
/*const updatePregnancy = async (req, res) => {
  try {
    const updatedPregnancy = await updateEntity('pregnancies', req.params.id, req.body);
    if (!updatedPregnancy) return res.status(404).send('Gravidez não encontrada');
    res.json(updatedPregnancy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
*/
/**
 * Função 3 
 * Atualiza os dados de uma gestação existente.
 * Esta função NÃO usa updateEntity para evitar o erro 'updated_at'.
 */
const updatePregnancy = async (req, res) => {
  const { id } = req.params;
  const { blood_glucose_level, heart_rate, uterine_height } = req.body; 

  const updates = {};
  if (blood_glucose_level !== undefined) updates.blood_glucose_level = blood_glucose_level;
  if (heart_rate !== undefined) updates.heart_rate = heart_rate;
  if (uterine_height !== undefined) updates.uterine_height = uterine_height;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  try {
    const updatedPregnancy = await updateEntity('pregnancies', id, updates);
    if (!updatedPregnancy) return res.status(404).send('Gravidez não encontrada');
    res.json(updatedPregnancy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 4
 * Atualiza a Data Provável do Parto (DPP) com base na Data da Última Menstruação (DUM).
 * 
 * Parâmetros:
 *  - req[Object]: Requisição HTTP.
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Gestação com a DPP recalculada.
 */
const updateDPP = async (req, res) => {
  try {
    const dum = await client.query('SELECT dum FROM pregnancies');
    const dpp = calculateDPPfromDUM(dum);
    const updatedPregnancy = await updateEntity('pregnancies', dpp);
    if (!updatedPregnancy) return res.status(404).send('Gravidez não encontrada');
    res.json(updatedPregnancy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 5
 * Calcula a Data Provável do Parto (DPP) a partir da Data da Última Menstruação (DUM).
 * 
 * Parâmetros:
 *  - dum[string]: Data da última menstruação (no formato ISO).
 * 
 * Retorno:
 *  - [string]: Data provável do parto (no formato ISO, "YYYY-MM-DD").
 */
function calculateDPPfromDUM(dum) {
  const dumDate = new Date(dum);
  const dpp = new Date(dumDate);
  dpp.setDate(dpp.getDate() + 1);
  dpp.setMonth(dpp.getMonth() - 3);
  dpp.getFullYear(dpp.getFullYear() + 1);

  return dpp.toISOString().split('T')[0];
}

module.exports = {
  createPregnancy,
  getPregnancies,
  updatePregnancy,
  updateDPP
};