const crypto = require('crypto');

if (process.env.NODE_ENV !== 'test') {
  console.error('Comando permitido apenas para testes (NODE_ENV=test).');
  process.exit(1);
}

const size = Number(process.argv[2]) || 48;

if (!Number.isInteger(size) || size < 32) {
  console.error('Use um tamanho inteiro >= 32 bytes. Exemplo: node scripts/generate-jwt-secret.js 48');
  process.exit(1);
}

const secret = crypto.randomBytes(size).toString('base64');

console.log('JWT_SECRET=' + secret);
console.log('JWT_EXPIRES_IN=8h');
