const crypto = require('crypto');

const size = Number(process.argv[2]) || 48;

if (!Number.isInteger(size) || size < 32) {
  console.error('Use um tamanho inteiro >= 32 bytes.');
  process.exit(1);
}

console.log(crypto.randomBytes(size).toString('base64url'));
