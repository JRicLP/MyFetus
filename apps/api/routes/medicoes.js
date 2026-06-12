/**
 * Rotas relacionadas ao registro de medições de fêmur fetal.
 *
 * Definição:
 *   Fornece endpoint para inserção de medições de fêmur de fetos, calculando o
 *   comprimento fetal estimado com base no comprimento do fêmur informado.
 *   Conecta-se ao banco de dados PostgreSQL usando `pg` e variáveis de ambiente.
 *
 * Endpoint:
 *   - POST / 
 *     - Parâmetros no corpo da requisição:
 *       - idade_gestacional_semanas [number]: Idade gestacional em semanas.
 *       - comp_femur_mm [number]             : Comprimento do fêmur em milímetros.
 *     - Retorna:
 *       - 201: Medição registrada com sucesso e dados calculados.
 *       - 400: Dados inválidos (tipo ou valores incorretos).
 *       - 500: Erro interno do servidor ao salvar a medição.
 *
 * Observações:
 *   - O comprimento fetal estimado em cm é calculado pela fórmula:
 *       comp_fetal_estimado_cm = 6.18 + 0.59 * comp_femur_mm
 *   - A tabela utilizada no banco é `medidas_fetais`.
 */
const express = require('express');
const router = express.Router();
const client = require('../backend');
const logger = require('../utils/logger');
const cryptoService = require('../services/cryptoService');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// Rota POST para salvar medição
router.post('/', authenticateToken, requireRole('medico', 'admin'), async (req, res) => {
  try {
    const { idade_gestacional_semanas, comp_femur_mm } = req.body;

    if (
      typeof idade_gestacional_semanas !== 'number' ||
      typeof comp_femur_mm !== 'number'
    ) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const comp_fetal_estimado_cm = 6.18 + 0.59 * comp_femur_mm;

    const insertQuery = `
      INSERT INTO medidas_fetais (
        idade_gestacional_semanas, ccn, crl, dgn, encryption_key_version
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const encrypted = cryptoService.encryptRecord({
      idade_gestacional_semanas,
      ccn: comp_fetal_estimado_cm,
      crl: comp_femur_mm,
      dgn: 0,
    }, 'medidas_fetais');

    const result = await client.query(insertQuery, [
      encrypted.idade_gestacional_semanas,
      encrypted.ccn,
      encrypted.crl,
      encrypted.dgn,
      cryptoService.getCurrentVersion(),
    ]);
    const savedMeasurement = cryptoService.decryptRecord(
      result.rows[0],
      'medidas_fetais'
    );

    res.status(201).json({
      mensagem: 'Medição salva com sucesso!',
      medicao: {
        ...savedMeasurement,
        comp_femur_mm,
        comp_fetal_estimado_cm,
      },
    });
  } catch (error) {
    logger.error('Erro ao salvar medição', {
      details: error.message,
      payload: req.body
    });
    res.status(500).json({ error: 'Erro ao salvar medição' });
  }
});

module.exports = router;
