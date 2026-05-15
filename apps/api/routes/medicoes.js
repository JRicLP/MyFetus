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

// Rota POST para salvar medição
router.post('/', async (req, res) => {
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
      INSERT INTO medidas_fetais (idade_gestacional_semanas, ccn, crl, dgn)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result = await client.query(insertQuery, [
      idade_gestacional_semanas,
      comp_fetal_estimado_cm,
      comp_femur_mm,
      0.0,
    ]);

    res.status(201).json({
      mensagem: 'Medição salva com sucesso!',
      medicao: {
        ...result.rows[0],
        comp_femur_mm,
        comp_fetal_estimado_cm,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao salvar medição' });
  }
});

module.exports = router;