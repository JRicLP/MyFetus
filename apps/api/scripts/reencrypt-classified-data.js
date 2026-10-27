const path = require('path');
const { argumentValue } = require('./cli-utils');

require('dotenv').config({
  path: process.env.ENV_FILE_PATH
    ? path.resolve(process.env.ENV_FILE_PATH)
    : path.resolve(__dirname, '../../../.env'),
});

if (argumentValue('--host')) process.env.PG_HOST = argumentValue('--host');
if (argumentValue('--port')) process.env.PG_PORT = argumentValue('--port');

const client = require('../backend');
const {
  getEncryptionStatus,
  migrateExistingData,
} = require('../services/dataEncryptionMigrationService');
const cryptoService = require('../services/cryptoService');
const logger = require('../utils/logger');

let isTerminating = false;

process.on('SIGINT', () => {
  if (isTerminating) {
    logger.error('Interrupção forçada imediata pelo operador');
    process.exit(130);
  }
  isTerminating = true;
  logger.warn('Sinal SIGINT (Ctrl+C) recebido. Concluindo lote corrente com segurança antes de encerrar...');
});

async function main() {
  const args = process.argv.slice(2);
  const showStatus = args.includes('--status');
  const execute = args.includes('--execute');
  const dryRun = !execute || args.includes('--dry-run');
  const stopOnError = args.includes('--stop-on-error');
  const batchSize = Number(argumentValue('--batch-size') || 100);
  const limit = Number(argumentValue('--limit') || 0);
  const table = argumentValue('--table');

  const currentVersion = cryptoService.getCurrentVersion();
  logger.info('Iniciando rotina de re-criptografia AES', {
    activeVersion: currentVersion,
    mode: dryRun ? 'DRY_RUN' : 'EXECUTE',
    batchSize,
    limit: limit || 'unlimited',
    table: table || 'all',
  });

  const initialStatus = await getEncryptionStatus(client, { table });
  logger.info('Inventário de versões de dados classificados (pré-migração)', {
    status: initialStatus,
  });

  if (showStatus) {
    return;
  }

  const startTime = Date.now();
  const summary = await migrateExistingData(client, {
    batchSize,
    dryRun,
    limit,
    shouldStop: () => isTerminating,
    stopOnError,
    table,
  });

  const durationSec = Number(((Date.now() - startTime) / 1000).toFixed(2));
  logger.info('Resultado da operação de re-criptografia', {
    durationSec,
    scanned: summary.scanned,
    migrated: summary.migrated,
    unchanged: summary.unchanged,
    orphanFilesScanned: summary.orphanFilesScanned,
    orphanFilesMigrated: summary.orphanFilesMigrated,
    errorCount: summary.errors.length,
    interrupted: summary.interrupted,
  });

  if (summary.interrupted) {
    logger.warn('Re-criptografia pausada graciosamente pelo operador (SIGINT). Lotes anteriores foram comitados com sucesso e a execução pode ser retomada a qualquer momento.', {
      lastProcessedTable: table || 'all',
      migratedCount: summary.migrated,
    });
  }

  if (summary.errors.length > 0) {
    logger.error('Erros identificados durante a re-criptografia', {
      errors: summary.errors,
    });
    process.exitCode = 1;
  }

  if (!dryRun && summary.migrated > 0) {
    const finalStatus = await getEncryptionStatus(client, { table });
    logger.info('Inventário de versões de dados classificados (pós-migração)', {
      status: finalStatus,
    });
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      logger.error('Erro fatal durante a re-criptografia', {
        error: error.message,
        stack: error.stack,
      });
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await client.end();
      } catch (closeError) {
        logger.warn('Falha ao encerrar pool de conexões com o banco', {
          error: closeError.message,
        });
      }
    });
}

module.exports = {
  main,
};
