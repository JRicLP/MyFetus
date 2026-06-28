const crypto = require('crypto');
const path = require('path');
const { execSync } = require('child_process');
const { updateEnvValue } = require('./env-file');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const restart = args.includes('--restart');
const rootDir = path.resolve(__dirname, '../../..');
const envPath = path.join(rootDir, '.env');
const secret = crypto.randomBytes(48).toString('base64url');

if (dryRun) {
  console.log('DRY RUN: JWT_SECRET seria rotacionado no .env local.');
  process.exit(0);
}

updateEnvValue(envPath, 'JWT_SECRET', secret);
console.log('JWT_SECRET rotacionado no .env local. Tokens anteriores foram invalidados.');

if (restart) {
  try {
    execSync('docker compose up -d --build backend', {
      cwd: rootDir,
      stdio: 'inherit',
    });
    console.log('Backend reiniciado com o novo segredo.');
  } catch (error) {
    console.error('Falha ao reiniciar o backend automaticamente.');
    process.exitCode = 1;
  }
}
