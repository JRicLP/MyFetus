const client = require('../backend');

async function seed() {
  try {
    const timestamp = Date.now();
    // Mensagens de log devem ir para error para não corromper o ID
    console.error('Iniciando inserção...');
    
    const userResult = await client.query(
      'INSERT INTO users (name, email, birthdate, role, password) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Paciente de Teste', `teste_${timestamp}@myfetus.com`, '1990-01-01', 'gestante', 'SenhaTeste123!']
    );
    const userId = userResult.rows[0].id;

    const pregnantResult = await client.query(
      'INSERT INTO pregnants (user_id) VALUES ($1) RETURNING id',
      [userId]
    );
    
    // LOG APENAS DO ID
    console.log(pregnantResult.rows[0].id);
    
    await client.end();
  } catch (err) {
    console.error('Erro no seed:', err);
    process.exit(1);
  }
}

seed();