/**
 * Rotas relacionadas aos eventos de gestações.
 *
 * Definição:
 *   Fornece endpoints para criação, listagem e atualização de eventos
 *   relacionados a uma gestação, utilizando o controller `pregnancyEventsController`.
 *
 * Endpoints:
 *   - POST   /           : Cria um novo evento para uma gestação.
 *   - GET    /           : Lista todos os eventos cadastrados.
 *   - PUT    /:id        : Atualiza um evento específico pelo ID.
 *
 * Observações:
 *   - Cada evento deve conter a referência à gestação (`pregnancy_id`),
 *     descrição do evento e data do evento.
 *   - Utiliza `express.Router` para modularização das rotas.
 */
const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/pregnancyEventsController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

router.post(
  '/',
  authenticateToken,
  requireRole('medico', 'admin'),
  eventsController.createEvent
);
router.get(
  '/',
  authenticateToken,
  requireRole('gestante', 'medico', 'admin'),
  eventsController.getEvents
);
router.put(
  '/:id',
  authenticateToken,
  requireRole('medico', 'admin'),
  eventsController.updatePregnancyEvent
);

module.exports = router;
