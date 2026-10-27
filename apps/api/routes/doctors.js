/**
 * Rotas relacionadas ao cadastro de médicos.
 *
 * Definição:
 *   Cria uma conta de médico (role 'medico' em `users` + registro em
 *   `doctors` com CRM/especialidade/telefone). Cadastro público, igual ao
 *   de paciente — por enquanto sem aprovação de admin.
 *
 * Endpoints:
 *   - POST /  : Cria uma conta de médico.
 *   - GET  /  : Lista médicos para decisão do admin.
 *   - GET  /me/approval : Consulta o próprio estado de aprovação.
 *   - PUT  /me : Reenvia dados corrigidos após rejeição/revogação.
 *   - POST /:id/approval : Decide aprovação, rejeição ou revogação.
 */
const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { createAuthLimiters } = require('../middlewares/authRateLimit');
const { registerLimiter } = createAuthLimiters();
const { createAdminReadLimiterOptions } = require('../middlewares/authRateLimit');
const { authenticateToken, requireRole, requireRoleWithoutDoctorApproval } = require('../middlewares/auth');
const { rateLimit } = require('express-rate-limit');

const adminReadLimiter = rateLimit(createAdminReadLimiterOptions());

router.post('/', registerLimiter, doctorController.createDoctor);
router.get(
  '/',
  adminReadLimiter,
  authenticateToken,
  requireRole('admin'),
  doctorController.listDoctors
);
router.get(
  '/me/approval',
  adminReadLimiter,
  authenticateToken,
  requireRoleWithoutDoctorApproval('medico'),
  doctorController.getMyApproval
);
router.put(
  '/me',
  adminReadLimiter,
  authenticateToken,
  requireRoleWithoutDoctorApproval('medico'),
  doctorController.resubmitDoctorApproval
);
router.post(
  '/:id/approval',
  adminReadLimiter,
  authenticateToken,
  requireRole('admin'),
  doctorController.decideDoctorApproval
);

module.exports = router;
