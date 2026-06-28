/**
 * Rotas relacionadas às gestantes.
 *
 * Definição:
 *   Fornece endpoints para criação, listagem e atualização de registros de gestantes,
 *   utilizando o controller `pregnantController`.
 *
 * Endpoints:
 *   - POST   /           : Cria um novo registro de gestante.
 *   - GET    /           : Lista todas as gestantes cadastradas.
 *   - PUT    /:id        : Atualiza informações de uma gestante específica pelo ID.
 *
 * Observações:
 *   - Cada gestante está vinculada a um usuário (`user_id`).
 *   - Utiliza `express.Router` para modularização das rotas.
 */
const express = require('express');
const router = express.Router();
const pregnantController = require('../controllers/pregnantController');
const alertController = require('../controllers/alertController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

router.post(
  '/',
  authenticateToken,
  requireRole('gestante', 'admin'),
  pregnantController.createPregnant
);

router.get(
  '/',
  authenticateToken,
  requireRole('medico', 'admin'),
  pregnantController.getPregnants
);

router.get(
  '/:id',
  authenticateToken,
  pregnantController.getPregnantById
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('medico', 'admin'),
  pregnantController.updatePregnant
);

router.get(
  '/:id/alerts',
  authenticateToken,
  requireRole('medico', 'admin'),
  alertController.getPatientAlerts
);

module.exports = router;