/**
 * Executa as migracoes do PostgreSQL sem depender do Docker Compose.
 *
 * Uso local ou em um Cloud Run Job:
 *   PG_USER=... PG_PASSWORD=... PG_DATABASE=... PG_HOST=... npm run db:migrate:cloud
 *
 * Cada arquivo e aplicado dentro de uma transacao e registrado em
 * schema_migrations. Um advisory lock impede dois deploys de migrarem o banco
 * simultaneamente.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const migrations = [
  ['01_create_tables.sql', 'create_tables.sql'],
  ['02_triggers.sql', 'triggers.sql'],
  ['03_migration.sql', 'migration.sql'],
  ['04_migration_sprint6_history.sql', 'migration_sprint6_history.sql'],
  ['05_doctor_patient_links.sql', 'doctor_patient_links.sql'],
  ['06_extracted_text.sql', 'migration_extracted_text.sql'],
  ['07_security_baseline.sql', 'migration_security_baseline.sql'],
  ['08_aes_encryption.sql', 'migration_aes_encryption.sql'],
  ['09_document_security.sql', 'migration_document_security.sql'],
  ['10_audit_trail.sql', 'migration_audit_trail.sql'],
  ['11_normalize_update_triggers.sql', 'migration_normalize_update_triggers.sql'],
];

function required(name) {
  if (!process.env[name]) {
    throw new Error(`${name} nao configurada`);
  }
  return process.env[name];
}

function stripPsqlMetaCommands(sql) {
  // create_tables.sql veio de pg_dump e possui \restrict/\unrestrict,
  // comandos do cliente psql que nao fazem parte do SQL enviado pelo pg.
  // O dump tambem define search_path vazio; isso impediria as migrations
  // seguintes de resolverem tabelas sem o prefixo public.
  return sql
    .split(/\r?\n/)
    .filter((line) => (
      !line.trim().startsWith('\\')
      && !line.includes("pg_catalog.set_config('search_path', '', false)")
    ))
    .join('\n');
}

async function runMigrations() {
  const pool = new Pool({
    user: required('PG_USER'),
    host: required('PG_HOST'),
    database: required('PG_DATABASE'),
    password: required('PG_PASSWORD'),
    port: Number(process.env.PG_PORT || 5432),
    max: 1,
  });

  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [7411103]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Volumes criados antes do controle de versao ja possuem o schema base.
    const existingBase = await client.query("SELECT to_regclass('public.users') AS table_name");
    if (existingBase.rows[0]?.table_name === 'users') {
      await client.query(
        "INSERT INTO public.schema_migrations (version) VALUES ('01_create_tables.sql') ON CONFLICT DO NOTHING",
      );
    }

    let appliedCount = 0;
    for (const [version, fileName] of migrations) {
      const alreadyApplied = await client.query(
        'SELECT 1 FROM public.schema_migrations WHERE version = $1',
        [version],
      );
      if (alreadyApplied.rowCount > 0) continue;

      const filePath = path.resolve(__dirname, '..', 'db', fileName);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo de migracao nao encontrado: ${filePath}`);
      }

      const sql = stripPsqlMetaCommands(fs.readFileSync(filePath, 'utf8'));
      console.log(`[INFO] Aplicando migracao ${version}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO public.schema_migrations (version) VALUES ($1)',
          [version],
        );
        await client.query('COMMIT');
        appliedCount += 1;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log(
      appliedCount === 0
        ? '[OK] Banco ja possui todas as migracoes.'
        : `[OK] ${appliedCount} migracao(oes) aplicada(s).`,
    );
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [7411103]);
    } finally {
      client.release();
      await pool.end();
    }
  }
}

if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('[ERRO] Falha nas migracoes:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { runMigrations, stripPsqlMetaCommands };
