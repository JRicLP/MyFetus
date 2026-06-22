const assert = require('assert');
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../../.env'),
  override: true,
});
process.env.PG_HOST = '127.0.0.1';
process.env.PG_PORT = '5434';

const client = require('../backend');
const {
  createUser,
  loginUser,
} = require('../controllers/userController');

function createResponse() {
  return {
    body: undefined,
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

async function run() {
  const email = `crypto-${Date.now()}@example.test`;
  const password = 'StrongPass123!';
  let userId;

  try {
    const createResponseMock = createResponse();
    await createUser({
      body: {
        name: 'Usuario Criptografado',
        email,
        password,
        birthdate: '1992-08-17',
      },
    }, createResponseMock);

    assert.strictEqual(createResponseMock.statusCode, 201);
    assert.strictEqual(createResponseMock.body.email, email);
    userId = createResponseMock.body.id;

    const stored = await client.query(
      `SELECT name, email, birthdate, email_lookup_hash,
              encryption_key_version
         FROM users WHERE id = $1`,
      [userId]
    );
    assert.match(stored.rows[0].name, /^v1:/);
    assert.match(stored.rows[0].email, /^v1:/);
    assert.match(stored.rows[0].birthdate, /^v1:/);
    assert.match(stored.rows[0].email_lookup_hash, /^[0-9a-f]{64}$/);
    assert.strictEqual(stored.rows[0].encryption_key_version, 1);

    const loginResponseMock = createResponse();
    await loginUser({
      body: { email: email.toUpperCase(), password },
    }, loginResponseMock);
    assert.strictEqual(loginResponseMock.statusCode, 200);
    assert.strictEqual(loginResponseMock.body.user.email, email);
    assert.ok(loginResponseMock.body.token);

    console.log('user crypto integration: OK');
  } finally {
    if (userId) {
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
