const crypto = require('crypto');
const path = require('path');
const { Client } = require('pg');
const { updateEnvValue } = require('./env-file');

const rootDir = path.resolve(__dirname, '../../..');
const envPath = path.join(rootDir, '.env');
require('dotenv').config({ path: envPath });

const required = ['PG_USER', 'PG_PASSWORD', 'PG_DATABASE', 'PG_HOST'];
for (const name of required) {
  if (!process.env[name]) {
    console.error(`${name} ausente no .env.`);
    process.exit(1);
  }
}

const client = new Client({
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  host: process.env.DB_ROTATION_HOST || process.env.PG_HOST,
  port: Number(process.env.DB_ROTATION_PORT || process.env.PG_PORT || 5432),
});

async function run() {
  const newPassword = crypto.randomBytes(32).toString('base64url');

  await client.connect();
  try {
    const result = await client.query(
      `SELECT format('ALTER ROLE %I PASSWORD %L', $1, $2) AS statement`,
      [process.env.PG_USER, newPassword]
    );
    await client.query(result.rows[0].statement);
    updateEnvValue(envPath, 'PG_PASSWORD', newPassword);
    console.log('Senha PostgreSQL rotacionada no banco e no .env local.');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('Falha ao rotacionar a senha PostgreSQL. O .env nao foi alterado.');
  console.error(error.message);
  process.exit(1);
});
