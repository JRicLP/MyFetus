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
const logger = require('./utils/logger');

function requireDatabaseEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} nao configurada`);
  }
  return value;
}

// Conexão ao banco de dados (usando Pool para gerenciar conexões)
const client = new Pool({
  user: requireDatabaseEnv('PG_USER'),
  host: requireDatabaseEnv('PG_HOST'),
  database: requireDatabaseEnv('PG_DATABASE'),
  password: requireDatabaseEnv('PG_PASSWORD'),
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432,
});

// Teste inicial de conexão
client.connect()
  .then((connection) => {
    connection.release();
    logger.info('✅ Conectado ao PostgreSQL com sucesso!');
    
    // Inicializa o catálogo LOINC após a conexão estar pronta
    const { initializeLoincTable } = require('./utils/loincInitializer');
    initializeLoincTable().catch((err) => {
      logger.error('⚠️ Aviso ao inicializar catálogo LOINC:', {
        details: err.message
      });
    });
  })
  .catch((err) => logger.error('❌ Erro ao conectar ao banco de dados', {
    details: err.message
  }));

module.exports = client;
module.exports.pool = client; // Alias para compatibilidade
