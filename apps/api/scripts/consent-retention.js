/**
 * Rotina de retenção dos registros de consentimento (E7-01.1).
 *
 * Anonimiza (remove IP e user agent) ou elimina registros de `consents` mais
 * antigos que o prazo de retenção. O prazo ainda está pendente de definição
 * institucional: sem CONSENT_RETENTION_DAYS a rotina não faz nada.
 *
 * Uso:
 *   CONSENT_RETENTION_DAYS=<dias> [CONSENT_RETENTION_ACTION=anonymize|delete] npm run consents:retention
 *   --dry-run apenas conta os registros afetados.
 *
 * O trigger da tabela só permite essas operações dentro da transação desta
 * rotina e apenas para registros fora do período de retenção.
 */
require('dotenv').config();
const { Pool } = require('pg');

const ACTIONS = ['anonymize', 'delete'];

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function required(name) {
  if (!process.env[name]) throw new Error(`${name} nao configurada`);
  return process.env[name];
}

async function run() {
  const retentionDays = positiveInteger(process.env.CONSENT_RETENTION_DAYS, null);
  if (!retentionDays) {
    console.log('[INFO] CONSENT_RETENTION_DAYS nao definido (prazo pendente de definicao). Nada foi alterado.');
    return;
  }

  const action = process.env.CONSENT_RETENTION_ACTION || 'anonymize';
  if (!ACTIONS.includes(action)) {
    throw new Error(`CONSENT_RETENTION_ACTION deve ser ${ACTIONS.join(' ou ')}`);
  }
  const dryRun = process.argv.includes('--dry-run');

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
    await client.query('BEGIN');
    await client.query("SELECT set_config('myfetus.consent_retention_job', 'on', true)");
    await client.query("SELECT set_config('myfetus.consent_retention_days', $1, true)", [String(retentionDays)]);

    const expired = `created_at < CURRENT_TIMESTAMP - make_interval(days => $1)`;
    let result;
    if (dryRun) {
      result = await client.query(`SELECT count(*)::int AS total FROM consents WHERE ${expired}`, [retentionDays]);
      console.log(`[DRY-RUN] ${result.rows[0].total} registro(s) fora do prazo de ${retentionDays} dia(s).`);
      await client.query('ROLLBACK');
      return;
    }

    if (action === 'delete') {
      result = await client.query(`DELETE FROM consents WHERE ${expired}`, [retentionDays]);
    } else {
      result = await client.query(
        `UPDATE consents SET ip_address = NULL, user_agent = NULL
          WHERE ${expired} AND (ip_address IS NOT NULL OR user_agent IS NOT NULL)`,
        [retentionDays]
      );
    }
    await client.query('COMMIT');
    console.log(`[OK] ${action}: ${result.rowCount} registro(s) fora do prazo de ${retentionDays} dia(s).`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(`[ERRO] ${error.message}`);
  process.exit(1);
});
