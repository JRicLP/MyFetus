const crypto = require('crypto');
const path = require('path');
const { execSync } = require('child_process');
const { getEnvValue, removeEnvKey, updateEnvValue } = require('./env-file');
const logger = require('../utils/logger');

function rotateJwtSecrets(envPath, options = {}) {
  const dryRun = options.dryRun === true;
  const clearPrevious = options.clearPrevious === true;

  if (clearPrevious) {
    if (!dryRun) {
      removeEnvKey(envPath, 'JWT_SECRET_PREVIOUS');
    }
    return {
      action: 'CLEAR_PREVIOUS',
      dryRun,
      message: 'JWT_SECRET_PREVIOUS removido do arquivo de ambiente.',
    };
  }

  const currentSecret = getEnvValue(envPath, 'JWT_SECRET');
  const newSecret = crypto.randomBytes(48).toString('base64url');

  if (dryRun) {
    return {
      action: 'ROTATE_DUAL_KEY',
      dryRun: true,
      newSecret,
      previousSecret: currentSecret,
      message: 'DRY RUN: JWT_SECRET seria promovido para JWT_SECRET_PREVIOUS e um novo secret seria gerado.',
    };
  }

  if (currentSecret) {
    updateEnvValue(envPath, 'JWT_SECRET_PREVIOUS', currentSecret);
  }
  updateEnvValue(envPath, 'JWT_SECRET', newSecret);

  return {
    action: 'ROTATE_DUAL_KEY',
    dryRun: false,
    newSecret,
    previousSecret: currentSecret,
    message: 'JWT_SECRET rotacionado com sucesso com retenção de JWT_SECRET_PREVIOUS (suporte dual-key ativo).',
  };
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const clearPrevious = args.includes('--clear-previous');
  const restart = args.includes('--restart');

  const rootDir = path.resolve(__dirname, '../../..');
  const envPath = process.env.ENV_FILE_PATH
    ? path.resolve(process.env.ENV_FILE_PATH)
    : path.join(rootDir, '.env');
  const result = rotateJwtSecrets(envPath, { dryRun, clearPrevious });

  const sanitizedResult = {
    action: result.action,
    dryRun: result.dryRun,
    message: result.message,
    newSecret: result.newSecret ? '[REDACTED]' : undefined,
    previousSecret: result.previousSecret ? '[REDACTED]' : undefined,
  };
  logger.info('Operação de rotação de JWT executada', { result: sanitizedResult });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (!dryRun && restart) {
    try {
      execSync('docker compose up -d --build backend', {
        cwd: rootDir,
        stdio: 'inherit',
      });
      logger.info('Backend reiniciado com o novo segredo JWT');
    } catch (error) {
      logger.error('Falha ao reiniciar o backend automaticamente', {
        error: error.message,
      });
      process.exitCode = 1;
    }
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    logger.error('Erro ao rotacionar segredo JWT', {
      error: err.message,
    });
    process.exitCode = 1;
  }
}

module.exports = {
  rotateJwtSecrets,
};
