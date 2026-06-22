const path = require('path');
const jwt = require('jsonwebtoken');

const rootDir = path.resolve(__dirname, '../../..');
require('dotenv').config({ path: path.join(rootDir, '.env') });

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET ausente ou muito curta no .env.');
  process.exit(1);
}

const token = jwt.sign(
  {
    id: 1,
    email: 'admin@example.com',
    role: 'admin',
  },
  process.env.JWT_SECRET,
  {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  }
);

console.log(token);
