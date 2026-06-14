const path = require('path');

function argumentValue(name) {
  const prefix = `${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : undefined;
}

require('dotenv').config({
  path: process.env.ENV_FILE_PATH
    ? path.resolve(process.env.ENV_FILE_PATH)
    : path.resolve(__dirname, '../../../.env'),
});
if (argumentValue('--host')) process.env.PG_HOST = argumentValue('--host');
if (argumentValue('--port')) process.env.PG_PORT = argumentValue('--port');

const client = require('../backend');
const {
  migrateExistingData,
} = require('../services/dataEncryptionMigrationService');

async function main() {
  const summary = await migrateExistingData(client, {
    dryRun: process.argv.includes('--dry-run'),
    limit: Number(argumentValue('--limit') || 0),
    stopOnError: process.argv.includes('--stop-on-error'),
  });

  console.log(JSON.stringify(summary, null, 2));
  if (summary.errors.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(`Migracao interrompida: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
