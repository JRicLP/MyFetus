/**
 * scripts/migrate.js
 * Executa as migracoes SQL pendentes no container PostgreSQL.
 * Funciona tanto para bancos novos quanto para bancos existentes com volume persistido.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function runMigrations() {
  loadEnv();
  const dbUser = process.env.PG_USER || 'myfetus_app';
  const dbName = process.env.PG_DATABASE || 'myfetus';

  function runSql(sql, options = {}) {
    const args = [
      'compose', 'exec', '-T', 'db', 'psql', '-X', '-v', 'ON_ERROR_STOP=1',
      '-U', dbUser, '-d', dbName,
    ];
    if (options.tuplesOnly) args.push('-A', '-t');
    return execFileSync('docker', args, {
      input: sql,
      encoding: 'utf8',
      stdio: ['pipe', options.silent ? 'pipe' : 'inherit', 'inherit'],
    });
  }

  console.log('[INFO] Verificando e aplicando migracoes pendentes no banco de dados...');

  // 1. Garante que a tabela de controle de migrations existe
  runSql(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);',
    { silent: true }
  );

  // 2. Em volumes antigos, o dump inicial ja criou users antes do controle de versao.
  const usersExist = runSql("SELECT to_regclass('public.users');", {
    silent: true,
    tuplesOnly: true,
  }).trim();

  if (usersExist === 'users') {
    runSql("INSERT INTO schema_migrations (version) VALUES ('01_create_tables.sql') ON CONFLICT DO NOTHING;", { silent: true });
  }

  // 3. Catalogo de migracoes ordenadas
  const migrations = [
    { id: '01_create_tables.sql', path: 'apps/api/db/create_tables.sql' },
    { id: '02_triggers.sql', path: 'apps/api/db/triggers.sql' },
    { id: '03_migration.sql', path: 'apps/api/db/migration.sql' },
    { id: '04_migration_sprint6_history.sql', path: 'apps/api/db/migration_sprint6_history.sql' },
    { id: '05_doctor_patient_links.sql', path: 'apps/api/db/doctor_patient_links.sql' },
    { id: '06_extracted_text.sql', path: 'apps/api/db/migration_extracted_text.sql' },
    { id: '07_security_baseline.sql', path: 'apps/api/db/migration_security_baseline.sql' },
    { id: '08_aes_encryption.sql', path: 'apps/api/db/migration_aes_encryption.sql' },
    { id: '09_document_security.sql', path: 'apps/api/db/migration_document_security.sql' },
    { id: '10_audit_trail.sql', path: 'apps/api/db/migration_audit_trail.sql' },
    { id: '11_normalize_update_triggers.sql', path: 'apps/api/db/migration_normalize_update_triggers.sql' },
  ];

  // 4. Consulta quais migracoes ja constam como aplicadas
  const appliedMigrations = runSql('SELECT version FROM schema_migrations;', {
    silent: true,
    tuplesOnly: true,
  })
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);

  let appliedCount = 0;

  for (const mig of migrations) {
    if (appliedMigrations.includes(mig.id)) {
      continue;
    }

    const fullPath = path.resolve(__dirname, '..', mig.path);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Arquivo de migracao nao encontrado: ${mig.path}`);
    }

    console.log(`[INFO] Aplicando migracao: ${mig.id}...`);
    const sqlContent = fs.readFileSync(fullPath, 'utf8');

    // O SQL e seu registro sao atomicos: uma falha aborta a transacao inteira.
    runSql(`BEGIN;\n${sqlContent}\nINSERT INTO schema_migrations (version) VALUES ('${mig.id}');\nCOMMIT;`, { silent: true });

    console.log(`[OK] Migracao concluida: ${mig.id}`);
    appliedCount++;
  }

  if (appliedCount === 0) {
    console.log('[OK] Banco de dados ja esta com todas as migracoes aplicadas.');
  } else {
    console.log(`[OK] ${appliedCount} nova(s) migracao(oes) aplicada(s) com sucesso.`);
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
