const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../..');
const composePath = path.join(rootDir, 'docker-compose.yml');

if (!fs.existsSync(composePath)) {
  console.error(`docker-compose.yml nao encontrado em ${composePath}`);
  process.exit(1);
}

const composeContent = fs.readFileSync(composePath, 'utf8');
const secretMatch = composeContent.match(/^\s*JWT_SECRET:\s*(.+)$/m);

if (!secretMatch) {
  console.error('Nao foi possivel localizar a linha JWT_SECRET no docker-compose.yml.');
  process.exit(1);
}

const secret = secretMatch[1].trim();
const base64UrlEncode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const header = { alg: 'HS256', typ: 'JWT' };
const issuedAt = Math.floor(Date.now() / 1000);
const expiresInSeconds = 8 * 60 * 60;

const payload = {
  id: 1,
  email: 'admin@example.com',
  role: 'admin',
  iat: issuedAt,
  exp: issuedAt + expiresInSeconds,
};

const encodedHeader = base64UrlEncode(header);
const encodedPayload = base64UrlEncode(payload);
const unsignedToken = `${encodedHeader}.${encodedPayload}`;
const signature = crypto
  .createHmac('sha256', secret)
  .update(unsignedToken)
  .digest('base64url');

const token = `${unsignedToken}.${signature}`;

console.log('JWT_SECRET atual encontrado no docker-compose.yml.');
console.log('\nJWT de teste gerado:');
console.log(token);
console.log('\nCurl de teste:');
console.log(`curl -X POST "http://localhost:3000/api/internal/rag/search" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{"query":"Pré-eclâmpsia","topK":3}'`);