const assert = require('assert');
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../../.env'),
  override: true,
});
process.env.PG_HOST = '127.0.0.1';
process.env.PG_PORT = '5434';

const client = require('../backend');
const { ENCRYPTED_FIELDS } = require('../config/dataClassification');

async function run() {
  try {
    for (const [table, fields] of Object.entries(ENCRYPTED_FIELDS)) {
      const tableResult = await client.query(
        `SELECT to_regclass($1) AS relation`,
        [`public.${table}`]
      );
      if (!tableResult.rows[0].relation) continue;

      const columns = await client.query(
        `SELECT column_name, data_type
           FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      const types = new Map(
        columns.rows.map((column) => [column.column_name, column.data_type])
      );

      for (const field of fields) {
        assert.strictEqual(
          types.get(field),
          'text',
          `${table}.${field} deve ser TEXT`
        );
      }
      assert.strictEqual(
        types.get('encryption_key_version'),
        'integer',
        `${table}.encryption_key_version deve existir`
      );
    }

    console.log('encryption schema integration: OK');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
