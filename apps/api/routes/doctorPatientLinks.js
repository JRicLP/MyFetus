/**
 * Rotas relacionadas ao vínculo entre médicos e gestantes.
 *
 * Definição:
 *   Permite que um médico busque uma gestante pelo email e crie/remova o
 *   vínculo que controla o acesso aos dados clínicos dela (tabela
 *   `doctor_patient_links`).
 *
 * Endpoints:
 *   - GET    /search?email=   : Busca gestante pelo email.
 *   - POST   /                : Cria/reativa o vínculo (`pregnant_id` no body).
 *   - DELETE /:pregnantId     : Desativa o vínculo.
 *
 * Observações:
 *   - Todas as rotas exigem `Authorization: Bearer <token>` de um usuário `medico`.
 */
const express = require('express');
const router = express.Router();
const doctorPatientLinkController = require('../controllers/doctorPatientLinkController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

router.get(
  '/search',
  authenticateToken,
  requireRole('medico'),
  doctorPatientLinkController.searchPatientByEmail
);

router.post(
  '/',
  authenticateToken,
  requireRole('medico'),
  doctorPatientLinkController.createLink
);

router.delete(
  '/:pregnantId',
  authenticateToken,
  requireRole('medico'),
  doctorPatientLinkController.removeLink
);

module.exports = router;
