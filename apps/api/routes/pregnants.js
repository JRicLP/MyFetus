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

router.post('/', pregnantController.createPregnant);
router.get('/', pregnantController.getPregnants);
router.put('/:id', pregnantController.updatePregnant);
router.get('/:id', pregnantController.getPregnantById);

module.exports = router;