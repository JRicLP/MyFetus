const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const {
  buildUpdate,
  migrateBatch,
  migrateExistingData,
  getEncryptionStatus,
} = require('../services/dataEncryptionMigrationService');
const { createCryptoService } = require('../services/cryptoService');
const { createFileCryptoService } = require('../services/fileCryptoService');

test('Re-criptografia em lotes (AES-256-GCM)', async (t) => {
  const keyV1 = crypto.randomBytes(32).toString('hex');
  const keyV2 = crypto.randomBytes(32).toString('hex');

  const envV1 = {
    AES_KEY_VERSION: '1',
    AES_ENCRYPTION_KEY_V1: keyV1,
  };

  const envV2 = {
    AES_KEY_VERSION: '2',
    AES_ENCRYPTION_KEY_V1: keyV1,
    AES_ENCRYPTION_KEY_V2: keyV2,
  };

  const cryptoV1 = createCryptoService({ env: envV1 });
  const cryptoV2 = createCryptoService({ env: envV2 });
  const fileCryptoV1 = createFileCryptoService({ env: envV1 });
  const fileCryptoV2 = createFileCryptoService({ env: envV2 });

  await t.test('buildUpdate deve detectar registro em versão anterior e atualizar encryption_key_version para versão atual', () => {
    // Registro cifrado com V1
    const encryptedV1 = cryptoV1.encryptRecord({ name: 'Maria Silva' }, 'users');
    const recordV1 = {
      id: 1,
      name: encryptedV1.name,
      encryption_key_version: 1,
    };

    // Sob a perspectiva do cryptoV2
    const originalEnv = process.env;
    try {
      process.env = { ...originalEnv, ...envV2 };
      const update = buildUpdate(recordV1, 'users');
      assert.equal(update.encryption_key_version, 2);
      assert.ok(update.name);
      // Deve decifrar com V2
      const decryptedWithV2 = cryptoV2.decryptRecord({ name: update.name, encryption_key_version: 2 }, 'users');
      assert.equal(decryptedWithV2.name, 'Maria Silva');
    } finally {
      process.env = originalEnv;
    }
  });

  await t.test('getEncryptionStatus deve inventariar registros e versões por tabela', async () => {
    const mockClient = {
      query: async (sql, params) => {
        if (sql.includes('to_regclass')) {
          return { rows: [{ relation: 'public.users' }] };
        }
        if (sql.includes('COUNT(*)')) {
          return {
            rows: [
              { total: '10', current_version_count: '6', legacy_count: '4' }
            ]
          };
        }
        return { rows: [] };
      },
      release: () => {},
    };

    const mockPool = {
      connect: async () => mockClient,
      query: mockClient.query,
    };

    const status = await getEncryptionStatus(mockPool, { env: envV2 });
    assert.ok(status.users);
    assert.equal(status.users.total, 10);
    assert.equal(status.users.currentVersion, 6);
    assert.equal(status.users.legacyOrPlaintext, 4);
    assert.equal(status.users.pending, 4);
  });

  await t.test('migrateExistingData com batchSize e resumabilidade deve processar apenas pendentes', async () => {
    const encryptedV1 = cryptoV1.encryptRecord({ name: 'Maria Silva' }, 'users');
    const queries = [];
    const mockClient = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('to_regclass')) {
          return { rows: [{ relation: 'public.users' }] };
        }
        if (sql.includes('SELECT * FROM "users"')) {
          // Se lastId == 0, retorna 1 linha pendente; na próxima, retorna vazio
          if (params[0] === 0) {
            return {
              rows: [
                {
                  id: 101,
                  name: encryptedV1.name,
                  encryption_key_version: 1,
                }
              ]
            };
          }
          return { rows: [] };
        }
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [] };
        }
        if (sql.includes('UPDATE "users"')) {
          return { rowCount: 1, rows: [] };
        }
        return { rows: [] };
      },
      release: () => {},
    };

    const mockPool = {
      connect: async () => mockClient,
      query: mockClient.query,
    };

    const originalEnv = process.env;
    try {
      process.env = { ...originalEnv, ...envV2 };
      const summary = await migrateExistingData(mockPool, {
        batchSize: 50,
        uploadsDirectory: path.join(os.tmpdir(), 'non-existent-uploads-test'),
      });

      assert.equal(summary.migrated, 1);
      assert.equal(summary.errors.length, 0);

      // Valida que a query filtrou por encryption_key_version < currentVersion
      const selectQuery = queries.find(q => q.sql.includes('SELECT * FROM "users"'));
      assert.ok(selectQuery, 'Deveria ter executado SELECT em users');
      assert.ok(selectQuery.sql.includes('encryption_key_version'), 'Deveria filtrar por encryption_key_version');
    } finally {
      process.env = originalEnv;
    }
  });

  await t.test('migrateBatch deve garantir atomicidade transacional: falha em um item reverte o lote inteiro', async () => {
    const executedTxCommands = [];
    const mockClient = {
      query: async (sql, params) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          executedTxCommands.push(sql);
          return { rows: [] };
        }
        if (sql.includes('UPDATE "users"')) {
          // Simula falha ao atualizar o segundo registro
          if (params && params.includes(202)) {
            throw new Error('Simulated DB error on record 202');
          }
          return { rowCount: 1, rows: [] };
        }
        return { rows: [] };
      },
      release: () => {},
    };

    const mockPool = {
      connect: async () => mockClient,
      query: mockClient.query,
    };

    const originalEnv = process.env;
    try {
      process.env = { ...originalEnv, ...envV2 };
      const records = [
        { id: 201, name: 'Alice', encryption_key_version: 1 },
        { id: 202, name: 'Bob', encryption_key_version: 1 },
      ];

      await assert.rejects(
        migrateBatch(mockPool, 'users', records, { dryRun: false }),
        /Simulated DB error on record 202/
      );

      // Valida que houve BEGIN e ROLLBACK, e NUNCA COMMIT
      assert.ok(executedTxCommands.includes('BEGIN'));
      assert.ok(executedTxCommands.includes('ROLLBACK'));
      assert.ok(!executedTxCommands.includes('COMMIT'));
    } finally {
      process.env = originalEnv;
    }
  });

  await t.test('migrateExistingData deve suportar interrupção graciosa via shouldStop', async () => {
    const mockClient = {
      query: async (sql, params) => {
        if (sql.includes('to_regclass')) {
          return { rows: [{ relation: 'public.users' }] };
        }
        if (sql.includes('SELECT * FROM "users"')) {
          return {
            rows: [
              { id: 301, name: 'Carlos', encryption_key_version: 1 }
            ]
          };
        }
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [] };
        }
        if (sql.includes('UPDATE "users"')) {
          return { rowCount: 1, rows: [] };
        }
        return { rows: [] };
      },
      release: () => {},
    };

    const mockPool = {
      connect: async () => mockClient,
      query: mockClient.query,
    };

    const originalEnv = process.env;
    try {
      process.env = { ...originalEnv, ...envV2 };
      // Deverá parar imediatamente antes ou logo após o primeiro lote
      let shouldStopTriggered = false;
      const summary = await migrateExistingData(mockPool, {
        batchSize: 1,
        shouldStop: () => {
          if (!shouldStopTriggered) {
            shouldStopTriggered = true;
            return false; // permite processar o primeiro lote
          }
          return true; // interrompe antes do segundo
        },
      });

      assert.equal(summary.interrupted, true, 'O summary deve registrar interrupted: true');
    } finally {
      process.env = originalEnv;
    }
  });
});
