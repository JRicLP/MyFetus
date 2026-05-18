/**
 * Controlador responsável por gerenciar os eventos relacionados às gestações.
 * Inclui funções para criação, listagem e atualização de eventos de acompanhamento.
 */
const client = require('../backend');
const updateEntity = require('../utils/updateEntity');

/**
 * Função 1
 * Cria um novo evento associado a uma gestação.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `body` com os campos do evento (pregnancy_id, descricao, data_evento).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Registro do evento criado.
 */
const createEvent = async (req, res) => {
  const { pregnancy_id, descricao, data_evento } = req.body;
  try {
    const result = await client.query(
      'INSERT INTO pregnancy_events (pregnancy_id, descricao, data_evento) VALUES ($1, $2, $3) RETURNING *',
      [pregnancy_id, descricao, data_evento]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 2
 * Retorna todos os eventos cadastrados de gestações.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição HTTP.
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Lista de eventos cadastrados.
 */
const getEvents = async (req, res) => {
  const { pregnancy_id } = req.query; // Pega o ID da URL

  if (!pregnancy_id) {
    return res.status(400).json({ error: 'O pregnancy_id é obrigatório' });
  }

  try {
    const result = await client.query(
      'SELECT * FROM pregnancy_events WHERE pregnancy_id = $1 ORDER BY data_evento DESC',
      [pregnancy_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 3
 * Atualiza as informações de um evento de gestação existente.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `params.id` (ID do evento) e `body` (campos a atualizar).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Registro atualizado do evento.
 */
const updatePregnancyEvent = async (req, res) => {
  try {
    const updatedEvent = await updateEntity('pregnancy_events', req.params.id, req.body);
    if (!updatedEvent) return res.status(404).send('Evento não encontrado');
    res.json(updatedEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createEvent,
  getEvents,
  updatePregnancyEvent
};