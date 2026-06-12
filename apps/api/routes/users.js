/**
 * Rotas relacionadas aos usuários do sistema.
 *
 * Definição:
 *   Fornece endpoints para criação, listagem, consulta, atualização, exclusão
 *   e autenticação de usuários, utilizando o controller `userController`.
 *
 * Endpoints:
 *   - POST   /           : Cria um novo usuário.
 *   - GET    /           : Lista todos os usuários cadastrados.
 *   - GET    /:id        : Consulta um usuário específico pelo ID.
 *   - PUT    /:id        : Atualiza informações de um usuário pelo ID.
 *   - DELETE /:id        : Remove um usuário do sistema pelo ID.
 *   - POST   /login      : Realiza autenticação de usuário (login).
 *
 * Observações:
 *   - Senhas são armazenadas de forma criptografada.
 *   - Utiliza `express.Router` para modularização das rotas.
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { requireUserAccess } = require('../middlewares/userAccess');
const { createAuthLimiters } = require('../middlewares/authRateLimit');
const { loginLimiter, registerLimiter, adminReadLimiter } = createAuthLimiters();

router.post('/', registerLimiter, userController.createUser);
router.post('/login', loginLimiter, userController.loginUser);

router.get('/', adminReadLimiter, authenticateToken, requireRole('admin'), userController.getUsers);
router.get('/:id', authenticateToken, requireUserAccess, userController.getUserById);
router.put('/:id', registerLimiter, authenticateToken, requireUserAccess, userController.updateUser);
router.delete('/:id', authenticateToken, requireRole('admin'), userController.deleteUser);

module.exports = router;
