const fs = require('fs');

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    throw new Error(`Arquivo .env nao encontrado em ${envPath}`);
  }

  return fs.readFileSync(envPath, 'utf8');
}

function updateEnvValue(envPath, key, value) {
  const content = readEnvFile(envPath);
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const nextLine = `${key}=${value}`;
  const updated = pattern.test(content)
    ? content.replace(pattern, nextLine)
    : `${content.replace(/\s*$/, '')}\n${nextLine}\n`;

  fs.writeFileSync(envPath, updated, { encoding: 'utf8', mode: 0o600 });
}

function getEnvValue(envPath, key) {
  const content = readEnvFile(envPath);
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
}

function removeEnvKey(envPath, key) {
  const content = readEnvFile(envPath);
  const pattern = new RegExp(`^${key}=.*\r?\n?`, 'm');
  const updated = content.replace(pattern, '');
  fs.writeFileSync(envPath, updated, { encoding: 'utf8', mode: 0o600 });
}

module.exports = {
  getEnvValue,
  readEnvFile,
  removeEnvKey,
  updateEnvValue,
};
