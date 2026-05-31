const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const restart = args.includes('--restart');

const rootDir = path.resolve(__dirname, '../../..');
const composePath = path.join(rootDir, 'docker-compose.yml');

if (!fs.existsSync(composePath)) {
  console.error(`docker-compose.yml nao encontrado em ${composePath}`);
  process.exit(1);
}

const composeContent = fs.readFileSync(composePath, 'utf8');
const secret = crypto.randomBytes(48).toString('base64url');
const expiresIn = '8h';

const secretPattern = /^(\s*JWT_SECRET:\s*)(.*)$/m;

if (!secretPattern.test(composeContent)) {
  console.error('Nao foi possivel localizar a linha JWT_SECRET no docker-compose.yml.');
  process.exit(1);
}

const updatedContent = composeContent.replace(secretPattern, `$1${secret}`);

const base64UrlEncode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const signJwt = (payload, signingSecret, tokenExpiresIn = expiresIn) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresSeconds = tokenExpiresIn === '8h' ? 8 * 60 * 60 : 8 * 60 * 60;

  const body = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + expiresSeconds,
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedBody = base64UrlEncode(body);
  const unsignedToken = `${encodedHeader}.${encodedBody}`;
  const signature = crypto
    .createHmac('sha256', signingSecret)
    .update(unsignedToken)
    .digest('base64url');

  return `${unsignedToken}.${signature}`;
};

if (dryRun) {
  console.log('DRY RUN: docker-compose.yml seria atualizado com um novo JWT_SECRET.');
} else {
  fs.writeFileSync(composePath, updatedContent, 'utf8');
  console.log(`JWT_SECRET atualizado em ${composePath}`);
}

const token = signJwt(
  {
    id: 1,
    email: 'admin@example.com',
    role: 'admin',
  },
  secret,
  expiresIn
);

console.log('\nNovo JWT_SECRET:');
console.log(secret);
console.log('\nJWT de teste gerado:');
console.log(token);
console.log('\nCurl de teste:');
console.log(`curl -X POST "http://localhost:3000/api/internal/loinc/term" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${token}" \
  -d '{"term":"Hemoglobina"}'`);

if (restart && !dryRun) {
  try {
    execSync('docker compose up -d --build backend', {
      cwd: rootDir,
      stdio: 'inherit',
    });
    console.log('\nBackend reiniciado com o novo segredo.');
  } catch (error) {
    console.error('Falha ao reiniciar o backend automaticamente.');
    process.exitCode = 1;
  }
}
