/**
 * Rotas relacionadas às gestações.
 *
 * Definição:
 *   Fornece endpoints para criação, listagem e atualização de gestações,
 *   utilizando o controller `pregnancyController`.
 *
 * Endpoints:
 *   - POST   /           : Cria uma nova gestação.
 *   - GET    /           : Lista todas as gestações cadastradas.
 *   - PUT    /:id        : Atualiza informações de uma gestação específica pelo ID.
 *   - PUT    /:id        : Atualiza a data prevista para parto (DPP) a partir do DUM.
 *
 * Observações:
 *   - Os dados da gestação incluem DUM, DPP, idade gestacional por ultrassonografia,
 *     glicemia, regularidade do ciclo, entre outros campos.
 *   - É utilizado `express.Router` para modularização das rotas.
 */
const express = require('express');
const router = express.Router();
const pregnancyController = require('../controllers/pregnancyController');

router.post('/', pregnancyController.createPregnancy);
router.get('/', pregnancyController.getPregnancies);
router.put('/:id', pregnancyController.updatePregnancy)
// router.put('/:id', pregnancyController.updateDPP)

module.exports = router;