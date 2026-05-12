/**
 * backend.js
 *
 * Configuração e conexão com o banco de dados PostgreSQL.
 *
 * Definição:
 *   Este módulo cria um pool de conexões utilizando o `pg.Pool` para gerenciar
 *   o acesso ao banco de dados PostgreSQL, permitindo consultas de forma eficiente.
 *
 * Configuração:
 *   - Utiliza variáveis de ambiente para usuário, senha, host, porta e database.
 *   - Valores padrão são fornecidos caso as variáveis não estejam definidas:
 *       user: 'myuser'
 *       host: 'myfetus-db'
 *       database: 'mydatabase'
 *       password: 'mypassword'
 *       port: 5432
 *
 * Funcionalidade:
 *   - Realiza teste inicial de conexão ao banco.
 *   - Exporta o objeto `client` para ser usado em outros módulos do backend.
 *
 * Observações:
 *   - O Pool gerencia múltiplas conexões simultâneas, evitando overhead
 *     de criação de conexões repetidas.
 *   - Mensagens de log indicam sucesso ou falha na conexão.
 */
require('dotenv').config();
const { Pool } = require('pg');

// Conexão ao banco de dados (usando Pool para gerenciar conexões)
const client = new Pool({
  user: process.env.PG_USER || 'myuser',
  host: process.env.PG_HOST || 'myfetus-db', // mesmo nome do container
  database: process.env.PG_DATABASE || 'mydatabase',
  password: process.env.PG_PASSWORD || 'mypassword',
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432,
});

// Teste inicial de conexão
client.connect()
  .then(() => console.log('✅ Conectado ao PostgreSQL com sucesso!'))
  .catch((err) => console.error('❌ Erro ao conectar ao banco de dados:', err.message));

module.exports = client;