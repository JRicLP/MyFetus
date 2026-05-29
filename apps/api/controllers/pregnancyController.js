/**
 * Controlador responsável por gerenciar informações de gestações.
 * Inclui funções para criação, listagem, atualização e cálculo de DPP (Data Provável do Parto).
  */
const client = require('../backend');
const updateEntity = require('../utils/updateEntity');
const logger = require('../utils/logger');
const {
  ensureCanAccessPregnant,
  ensureCanAccessPregnancy,
} = require('../utils/clinicalAccess');

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
  const { pregnant_id, weeks, is_checked = false, dum, dpp, ccn = 0.0, dgm = 0.0, glicemia = 0, frequencia_cardiaca = 0, altura_uterina=0.0, regularidade_do_ciclo = true, ig_ultrassonografia } = req.body;

  if (!pregnant_id) {
    return res.status(400).json({ error: 'pregnant_id é obrigatório' });
  }

  if (!dum || !dpp || !ig_ultrassonografia) {
    return res.status(400).json({ error: 'Campos dum, dpp, glicemia, frequencia_cardiaca e ig_ultrassonografia são obrigatórios' });
  }
  try {
    const canAccess = await ensureCanAccessPregnant(req, res, pregnant_id);
    if (!canAccess) return;

    const result = await client.query(
      'INSERT INTO pregnancies (pregnant_id, weeks, is_checked, dum, dpp, ccn, dgm, glicemia, frequencia_cardiaca, altura_uterina, regularidade_do_ciclo, ig_ultrassonografia) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [pregnant_id, weeks, is_checked, dum, dpp, ccn, dgm, glicemia, frequencia_cardiaca, altura_uterina, regularidade_do_ciclo, ig_ultrassonografia]
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
    let query;
    let params = [];

    if (req.user.role === 'admin') {
      query = 'SELECT * FROM pregnancies ORDER BY created_at DESC';
    } else if (req.user.role === 'medico') {
      query = `
        SELECT preg.*
        FROM pregnancies preg
        JOIN doctor_patient_links dpl ON dpl.pregnant_id = preg.pregnant_id
        WHERE dpl.doctor_id = $1
          AND dpl.status = 'active'
        ORDER BY preg.created_at DESC
      `;
      params = [req.user.id];
    } else if (req.user.role === 'gestante') {
      query = `
        SELECT preg.*
        FROM pregnancies preg
        JOIN pregnants p ON p.id = preg.pregnant_id
        WHERE p.user_id = $1
        ORDER BY preg.created_at DESC
      `;
      params = [req.user.id];
    } else {
      return res.status(403).json({ error: 'Perfil de usuário não autorizado' });
    }

    const result = await client.query(query, params);
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
  const { glicemia, frequencia_cardiaca, altura_uterina } = req.body; 

  // Constrói a query dinamicamente 
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (glicemia !== undefined) {
    fields.push(`glicemia = $${paramCount++}`);
    values.push(glicemia);
  }
  if (frequencia_cardiaca !== undefined) {
    fields.push(`frequencia_cardiaca = $${paramCount++}`);
    values.push(frequencia_cardiaca);
  }
  if (altura_uterina !== undefined) { 
  fields.push(`altura_uterina = $${paramCount++}`);
  values.push(altura_uterina);
  }
  

  if (fields.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  values.push(id); 

  const query = `
    UPDATE pregnancies 
    SET ${fields.join(', ')} 
    WHERE id = $${paramCount} 
    RETURNING *;
  `;

  try {
    const pregnancy = await ensureCanAccessPregnancy(req, res, id);
    if (!pregnancy) return;

    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).send('Gravidez não encontrada');
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Erro ao atualizar gravidez', {
      details: err.message,
      pregnancyId: id
    });
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
