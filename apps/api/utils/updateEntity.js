/**
 * Função utilitária para atualizar registros em uma tabela do banco de dados.
 *
 * Definição:
 *   Permite atualizar qualquer registro em uma tabela específica, definindo os
 *   campos a serem alterados a partir de um objeto `data`. Atualiza automaticamente
 *   o campo `updated_at` com a data e hora atuais.
 *
 * Parâmetros:
 *   - table [string] : Nome da tabela onde o registro será atualizado.
 *   - id [number]    : ID do registro a ser atualizado.
 *   - data [object]  : Objeto contendo os campos e valores a serem atualizados.
 *
 * Retorno:
 *   - [object]       : Retorna o registro atualizado.
 *
 * Observações:
 *   - Lança erro se o objeto `data` estiver vazio.
 *   - Utiliza `client` do módulo `backend` para executar a query SQL.
 *   - Adiciona automaticamente `updated_at = CURRENT_TIMESTAMP`.
 */
const client = require('../backend');

async function updateEntity(table, id, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);

  if (keys.length === 0) {
    throw new Error('Nenhum campo para atualizar.');
  }

  const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
  const query = `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1} RETURNING *`;

  const result = await client.query(query, [...values, id]);
  return result.rows[0];
}

module.exports = updateEntity