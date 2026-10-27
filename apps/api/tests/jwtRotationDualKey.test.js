const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('child_process');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { authenticateToken } = require('../middlewares/auth');
const { getSecurityConfig } = require('../config/security');
const { updateEnvValue } = require('../scripts/env-file');

test('authenticateToken com suporte dual-key JWT', async (t) => {
  const secretCurrent = 'super-secret-key-current-at-least-32-chars-long';
  const secretPrevious = 'super-secret-key-previous-at-least-32-chars-long';
  const originalSecret = process.env.JWT_SECRET;
  const originalPrevious = process.env.JWT_SECRET_PREVIOUS;

  t.beforeEach(() => {
    process.env.JWT_SECRET = secretCurrent;
    process.env.JWT_SECRET_PREVIOUS = secretPrevious;
  });

  t.afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
    if (originalPrevious === undefined) {
      delete process.env.JWT_SECRET_PREVIOUS;
    } else {
      process.env.JWT_SECRET_PREVIOUS = originalPrevious;
    }
  });

  await t.test('deve autenticar token assinado com a chave atual (JWT_SECRET)', () => {
    const token = jwt.sign({ id: 10, role: 'medico' }, secretCurrent, { expiresIn: '1h' });
    let nextCalled = false;
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {
      status() { return this; },
      json() { return this; },
    };

    authenticateToken(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.user.id, 10);
    assert.equal(req.user.role, 'medico');
  });

  await t.test('deve autenticar com sucesso token assinado com a chave anterior (JWT_SECRET_PREVIOUS)', () => {
    const legacyToken = jwt.sign({ id: 20, role: 'gestante' }, secretPrevious, { expiresIn: '1h' });
    let nextCalled = false;
    const req = { headers: { authorization: `Bearer ${legacyToken}` } };
    const res = {
      status() { return this; },
      json() { return this; },
    };

    authenticateToken(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.user.id, 20);
    assert.equal(req.user.role, 'gestante');
  });

  await t.test('deve rejeitar token assinado com chave anterior quando expirado', () => {
    const expiredToken = jwt.sign(
      { id: 20, role: 'gestante' },
      secretPrevious,
      { expiresIn: -10 } // já expirado
    );
    let statusCode = null;
    let responseBody = null;
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    authenticateToken(req, res, () => {
      assert.fail('next() não deveria ser chamado para token expirado');
    });

    assert.equal(statusCode, 401);
    assert.equal(responseBody.error, 'Token inválido ou expirado');
  });

  await t.test('deve rejeitar token com assinatura inválida em ambas as chaves', () => {
    const foreignToken = jwt.sign({ id: 99 }, 'foreign-secret-completely-different-32chars', { expiresIn: '1h' });
    let statusCode = null;
    let responseBody = null;
    const req = { headers: { authorization: `Bearer ${foreignToken}` } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    authenticateToken(req, res, () => {
      assert.fail('next() não deveria ser chamado para token inválido');
    });

    assert.equal(statusCode, 401);
    assert.equal(responseBody.error, 'Token inválido ou expirado');
  });
});
test('getSecurityConfig validação de JWT_SECRET_PREVIOUS', async (t) => {
  await t.test('deve lançar erro se JWT_SECRET_PREVIOUS tiver menos de 32 caracteres', () => {
    assert.throws(
      () => {
        getSecurityConfig({
          JWT_SECRET: 'at-least-32-characters-required-for-jwt-secret',
          JWT_SECRET_PREVIOUS: 'short-key',
        });
      },
      /JWT_SECRET_PREVIOUS deve possuir ao menos 32 caracteres/
    );
  });

  await t.test('deve aceitar quando JWT_SECRET_PREVIOUS possui 32 ou mais caracteres', () => {
    const config = getSecurityConfig({
      JWT_SECRET: 'at-least-32-characters-required-for-jwt-secret',
      JWT_SECRET_PREVIOUS: 'at-least-32-characters-required-for-previous-secret',
    });
    assert.ok(config);
  });
});

test('rotateJwtSecrets em arquivo .env', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jwt-rot-'));
  const tempEnv = path.join(tempDir, '.env');
  fs.writeFileSync(tempEnv, 'JWT_SECRET=initial-secret-key-at-least-32-chars\nPORT=3000\n');

  t.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  await t.test('dry-run não deve alterar o arquivo', () => {
    const { rotateJwtSecrets } = require('../scripts/rotate-jwt-secret-and-generate-token');
    const result = rotateJwtSecrets(tempEnv, { dryRun: true });
    assert.equal(result.dryRun, true);
    assert.equal(result.previousSecret, 'initial-secret-key-at-least-32-chars');
    assert.ok(result.newSecret.length >= 32);

    const content = fs.readFileSync(tempEnv, 'utf8');
    assert.ok(content.includes('JWT_SECRET=initial-secret-key-at-least-32-chars'));
    assert.ok(!content.includes('JWT_SECRET_PREVIOUS'));
  });

  await t.test('execução real deve promover secret para JWT_SECRET_PREVIOUS e gerar novo JWT_SECRET', () => {
    const { rotateJwtSecrets } = require('../scripts/rotate-jwt-secret-and-generate-token');
    const result = rotateJwtSecrets(tempEnv, { dryRun: false });
    assert.equal(result.dryRun, false);

    const content = fs.readFileSync(tempEnv, 'utf8');
    assert.ok(content.includes('JWT_SECRET_PREVIOUS=initial-secret-key-at-least-32-chars'));
    assert.ok(content.includes(`JWT_SECRET=${result.newSecret}`));
    assert.ok(content.includes('PORT=3000'));
  });

  await t.test('--clear-previous deve remover JWT_SECRET_PREVIOUS', () => {
    const { rotateJwtSecrets } = require('../scripts/rotate-jwt-secret-and-generate-token');
    rotateJwtSecrets(tempEnv, { clearPrevious: true });

    const content = fs.readFileSync(tempEnv, 'utf8');
    assert.ok(!content.includes('JWT_SECRET_PREVIOUS='));
  });

  await t.test('CLI deve executar a rotação em dry-run', () => {
    fs.writeFileSync(tempEnv, 'JWT_SECRET=initial-secret-key-at-least-32-chars\nPORT=3000\n');
    const scriptPath = path.join(
      __dirname,
      '..',
      'scripts',
      'rotate-jwt-secret-and-generate-token.js'
    );
    const stdout = execFileSync(
      process.execPath,
      [scriptPath, '--dry-run'],
      {
        env: { ...process.env, ENV_FILE_PATH: tempEnv },
        encoding: 'utf8',
      }
    );
    const resultStart = stdout.lastIndexOf('\n{');
    const result = JSON.parse(stdout.slice(resultStart).trim());

    assert.equal(result.action, 'ROTATE_DUAL_KEY');
    assert.equal(result.dryRun, true);
    assert.equal(result.previousSecret, 'initial-secret-key-at-least-32-chars');
    assert.ok(result.newSecret.length >= 32);
  });
});

