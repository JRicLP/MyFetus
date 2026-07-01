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
 */
const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { createAuthLimiters } = require('../middlewares/authRateLimit');
const { registerLimiter } = createAuthLimiters();

router.post('/', registerLimiter, doctorController.createDoctor);

module.exports = router;
