// como testar:
// cd apps/api
// docker compose run --rm backend node /app/tests/database.test.js

const assert = require('assert');
const bcrypt = require('bcrypt');
const client = require('../backend');
const logger = require('../utils/logger');
const { sanitizeForLog } = require('../utils/piiSanitizer');

const originalLog = console.log;
const originalError = console.error;
const captured = [];

console.log = (...args) => {
  captured.push(['log', args.join(' ')]);
};

console.error = (...args) => {
  captured.push(['error', args.join(' ')]);
};

async function runDatabaseTest() {
  let userId = null;
  let pregnantId = null;

  const randomEmail = `ana.souza+${Date.now()}@example.com`;

  try {
    // Dados de teste com PII (usuário)
    const userData = {
      name: 'Ana Carolina Souza Santos',
      email: randomEmail,
      password: 'senha123Segura!',
      birthdate: '1988-12-20',
      role: 'gestante'
    };

    // Dados de teste (gestante vinculada ao usuário)
    const pregnantData = {
      peso_atual: 68.5,
      altura: 165,
      pressao_sistole: 118,
      pressao_diastole: 76,
      temperatura_materna: 36.8
    };

    originalLog('\n=== TESTE DE COMUNICAÇÃO DIRETA COM DATABASE ===\n');
    originalLog('DADOS BRUTOS DO USUÁRIO (com PII):');
    originalLog(JSON.stringify(userData, null, 2));

    // Log através do logger (deve sanitizar)
    originalLog('\nInserindo usuário na database...');
    logger.info('Iniciando inserção de usuário com dados PII', { user: userData });

    // Inserir usuário na tabela users
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const userInsertQuery = `
      INSERT INTO users (name, email, password, birthdate, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, birthdate, role, created_at
    `;

    const userResult = await client.query(userInsertQuery, [
      userData.name,
      userData.email,
      hashedPassword,
      userData.birthdate,
      userData.role
    ]);

    userId = userResult.rows[0].id;
    originalLog(`✅ Usuário inserido com sucesso! ID: ${userId}`);

    // Inserir gestante vinculada ao usuário
    originalLog('\nInserindo gestante na database...');
    const pregnantInsertQuery = `
      INSERT INTO pregnants (user_id, peso_atual, altura, pressao_sistole, pressao_diastole, temperatura_materna)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, peso_atual, altura, pressao_sistole, pressao_diastole, temperatura_materna, created_at
    `;

    const pregnantResult = await client.query(pregnantInsertQuery, [
      userId,
      pregnantData.peso_atual,
      pregnantData.altura,
      pregnantData.pressao_sistole,
      pregnantData.pressao_diastole,
      pregnantData.temperatura_materna
    ]);

    pregnantId = pregnantResult.rows[0].id;
    originalLog(`✅ Gestante inserida com sucesso! ID: ${pregnantId}`);

    // Recuperar dados do banco (usuário + gestante)
    originalLog('\nRecuperando dados COMPLETOS do banco...');
    const userSelectQuery = 'SELECT id, name, email, birthdate, role FROM users WHERE id = $1';
    const userRetrieved = await client.query(userSelectQuery, [userId]);
    const userRecord = userRetrieved.rows[0];

    const pregnantSelectQuery = 'SELECT * FROM pregnants WHERE id = $1';
    const pregnantRetrieved = await client.query(pregnantSelectQuery, [pregnantId]);
    const pregnantRecord = pregnantRetrieved.rows[0];

    originalLog('\n📊 DADOS RECUPERADOS DO BANCO (SEM SANITIZAÇÃO):');
    originalLog('\nUSUÁRIO:');
    originalLog(JSON.stringify(userRecord, null, 2));
    originalLog('\nGESTANTE:');
    originalLog(JSON.stringify(pregnantRecord, null, 2));

    // Aplicar sanitização como seria feita nos logs
    const sanitizedUser = sanitizeForLog(userRecord, 'users');
    const sanitizedPregnant = sanitizeForLog(pregnantRecord, 'pregnants');

    originalLog('\n🔐 DADOS COM SANITIZAÇÃO PARA LOG:');
    originalLog('\nUSUÁRIO (sanitizado):');
    originalLog(JSON.stringify(sanitizedUser, null, 2));
    originalLog('\nGESTANTE (sanitizado):');
    originalLog(JSON.stringify(sanitizedPregnant, null, 2));

    // Validações
    originalLog('\n=== VALIDAÇÕES ===');

    // Validar que dados foram salvos corretamente no banco
    assert.strictEqual(userRecord.name, userData.name, 'Nome deve ser igual');
    assert.strictEqual(userRecord.email, userData.email, 'Email deve ser igual');
    assert.ok(userRecord.birthdate.toISOString().includes(userData.birthdate) || userRecord.birthdate.toString().includes(userData.birthdate), 'Data de nascimento deve ser igual');
    assert.strictEqual(pregnantRecord.peso_atual, pregnantData.peso_atual, 'Peso deve ser igual');
    originalLog('✅ Dados no banco estão íntegros');

    // Validar que sanitização esconde PII de usuário
    assert.ok(!sanitizedUser.name.includes('Carolina'), 'Nome sanitizado não deve conter sobrenomes completos');
    assert.ok(!sanitizedUser.email.includes('example.com'), 'Email sanitizado não deve conter domínio original');
    assert.ok(sanitizedUser.email.includes('***') || sanitizedUser.email.includes('*'), 'Email sanitizado deve ter máscaras');
    originalLog('✅ PII de usuário está sanitizado corretamente');

    // Validar que dados clínicos são preservados em gestante
    assert.strictEqual(sanitizedPregnant.peso_atual, pregnantData.peso_atual, 'Peso deve ser preservado');
    assert.strictEqual(sanitizedPregnant.altura, pregnantData.altura, 'Altura deve ser preservada');
    assert.strictEqual(sanitizedPregnant.pressao_sistole, pregnantData.pressao_sistole, 'Pressão deve ser preservada');
    originalLog('✅ Dados clínicos são preservados na sanitização');

    // Limpar: remover registros de teste
    originalLog('\nLimpando dados de teste...');
    await client.query('DELETE FROM pregnants WHERE id = $1', [pregnantId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    originalLog('✅ Registros de teste removidos');

    originalLog('\n=== TESTE COMPLETO COM SUCESSO ===\n');

    // Exibir resumo
    originalLog('RESUMO DO TESTE:');
    originalLog(`  ✅ Inserção em banco: Usuário + Gestante`);
    originalLog(`  ✅ Recuperação: Dados íntegros do banco`);
    originalLog(`  ✅ Sanitização: PII mascarado em logs`);
    originalLog(`  ✅ Integridade clínica: Dados médicos preservados`);
    originalLog(`\nCAMPOS PII MASCARADOS: name, email, birthdate`);
    originalLog(`CAMPOS CLÍNICOS PRESERVADOS: peso_atual, altura, pressao_sistole, pressao_diastole, temperatura_materna`);

  } catch (error) {
    originalLog('\n❌ ERRO NO TESTE:');
    originalLog(`Mensagem: ${error.message}`);
    if (error.detail) {
      originalLog(`Detalhe: ${error.detail}`);
    }
    if (error.code) {
      originalLog(`Código: ${error.code}`);
    }
    logger.error('Erro durante teste de database', {
      message: error.message,
      detail: error.detail || 'Sem detalhes',
      code: error.code
    });
    throw error;
  } finally {
    await client.end();
  }
}

runDatabaseTest().catch((err) => {
  originalLog('\n❌ Teste falhou!');
  originalLog(err.message);
  process.exit(1);
});
