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

router.post('/', userController.createUser);
router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.post('/login', userController.loginUser);

module.exports = router;