/**
 * Controlador responsável por gerenciar o vínculo entre médicos e gestantes
 * (tabela `doctor_patient_links`). É esse vínculo que determina quais
 * pacientes aparecem no dashboard do médico e quais dados clínicos ele pode
 * acessar (ver `utils/clinicalAccess.js`).
 */
const client = require('../backend');

/**
 * Função 1
 * Busca uma gestante pelo email para o médico vincular.
 *
 * Parâmetros:
 *  - req[Object]: Requisição contendo `query.email`.
 *  - res[Object]: Resposta HTTP.
 *
 * Retorno:
 *  - [JSON]: Dados básicos da gestante encontrada e se já está vinculada ao médico logado.
 */
const searchPatientByEmail = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'email é obrigatório' });
  }

  try {
    const result = await client.query(
      `
      SELECT
        p.id AS pregnant_id,
        u.name AS patient_name,
        u.email AS patient_email,
        EXISTS (
          SELECT 1 FROM doctor_patient_links dpl
          WHERE dpl.doctor_id = $2
            AND dpl.pregnant_id = p.id
            AND dpl.status = 'active'
        ) AS already_linked
      FROM pregnants p
      JOIN users u ON u.id = p.user_id
      WHERE u.email = $1
        AND u.role IN ('gestante', 'user')
      `,
      [email, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhuma gestante encontrada com esse email' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 2
 * Cria (ou reativa) o vínculo entre o médico autenticado e uma gestante.
 *
 * Parâmetros:
 *  - req[Object]: Requisição contendo `body.pregnant_id`.
 *  - res[Object]: Resposta HTTP.
 *
 * Retorno:
 *  - [JSON]: Vínculo criado/reativado.
 */
const createLink = async (req, res) => {
  const { pregnant_id } = req.body;

  if (!pregnant_id) {
    return res.status(400).json({ error: 'pregnant_id é obrigatório' });
  }

  try {
    const pregnant = await client.query('SELECT id FROM pregnants WHERE id = $1', [pregnant_id]);
    if (pregnant.rows.length === 0) {
      return res.status(404).json({ error: 'Gestante não encontrada' });
    }

    const result = await client.query(
      `
      INSERT INTO doctor_patient_links (doctor_id, pregnant_id, status)
      VALUES ($1, $2, 'active')
      ON CONFLICT (doctor_id, pregnant_id)
      DO UPDATE SET status = 'active', updated_at = CURRENT_TIMESTAMP
      RETURNING *
      `,
      [req.user.id, pregnant_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 3
 * Desativa o vínculo entre o médico autenticado e uma gestante.
 *
 * Parâmetros:
 *  - req[Object]: Requisição contendo `params.pregnantId`.
 *  - res[Object]: Resposta HTTP.
 *
 * Retorno:
 *  - [JSON]: Vínculo desativado.
 */
const removeLink = async (req, res) => {
  const { pregnantId } = req.params;

  try {
    const result = await client.query(
      `
      UPDATE doctor_patient_links
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE doctor_id = $1 AND pregnant_id = $2
      RETURNING *
      `,
      [req.user.id, pregnantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vínculo não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  searchPatientByEmail,
  createLink,
  removeLink,
};
