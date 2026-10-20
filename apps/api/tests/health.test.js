const assert = require('assert');
const test = require('node:test');

test('Readiness Probe and Liveness Probe', async (t) => {
  const {
    checkDatabase,
    checkVectorStore,
    getHealthStatus,
    handleHealthRequest,
  } = require('../services/healthService');

  await t.test('checkDatabase returns up when query succeeds within timeout', async () => {
    const mockDb = {
      query: async (sql) => {
        assert.strictEqual(sql, 'SELECT 1');
        return { rows: [{ '?column?': 1 }] };
      },
    };

    const result = await checkDatabase(mockDb, 3000);
    assert.strictEqual(result.status, 'up');
    assert.strictEqual(typeof result.latency_ms, 'number');
    assert.strictEqual(result.error, undefined);
  });

  await t.test('checkDatabase returns down when query fails or rejects', async () => {
    const mockDb = {
      query: async () => {
        throw new Error('Connection terminated unexpectedly');
      },
    };

    const result = await checkDatabase(mockDb, 3000);
    assert.strictEqual(result.status, 'down');
    assert.strictEqual(typeof result.latency_ms, 'number');
    assert.strictEqual(result.error, undefined);
  });

  await t.test('checkDatabase returns down when query times out', async () => {
    const mockDb = {
      query: () => new Promise((resolve) => setTimeout(resolve, 500)),
    };

    const result = await checkDatabase(mockDb, 50); // 50ms timeout
    assert.strictEqual(result.status, 'down');
  });

  await t.test('checkVectorStore returns up when describeIndexStats succeeds', async () => {
    const mockVectorStore = {
      describeIndexStats: async () => ({
        namespaces: {},
        dimension: 384,
        indexFullness: 0,
        totalRecordCount: 10,
      }),
    };

    const result = await checkVectorStore(mockVectorStore, 3000);
    assert.strictEqual(result.status, 'up');
    assert.strictEqual(typeof result.latency_ms, 'number');
  });

  await t.test('checkVectorStore returns down when service fails or key is missing', async () => {
    const mockVectorStore = {
      describeIndexStats: async () => {
        throw new Error('PINECONE_API_KEY não configurada');
      },
    };

    const result = await checkVectorStore(mockVectorStore, 3000);
    assert.strictEqual(result.status, 'down');
    assert.strictEqual(result.error, undefined);
  });

  await t.test('getHealthStatus returns status ok (HTTP 200) when all checks are up', async () => {
    const mockDb = { query: async () => ({ rows: [] }) };
    const mockVectorStore = { describeIndexStats: async () => ({}) };

    const { httpStatus, payload } = await getHealthStatus({
      db: mockDb,
      vectorStore: mockVectorStore,
      version: '1.0.0',
    });

    assert.strictEqual(httpStatus, 200);
    assert.strictEqual(payload.status, 'ok');
    assert.strictEqual(payload.version, '1.0.0');
    assert.ok(payload.timestamp);
    assert.strictEqual(payload.checks.database.status, 'up');
    assert.strictEqual(payload.checks.vector_store.status, 'up');
  });

  await t.test('getHealthStatus returns status degraded (HTTP 200) when database is up and vector_store is down', async () => {
    const mockDb = { query: async () => ({ rows: [] }) };
    const mockVectorStore = {
      describeIndexStats: async () => {
        throw new Error('Pinecone connection error');
      },
    };

    const { httpStatus, payload } = await getHealthStatus({
      db: mockDb,
      vectorStore: mockVectorStore,
      version: '1.0.0',
    });

    assert.strictEqual(httpStatus, 200);
    assert.strictEqual(payload.status, 'degraded');
    assert.strictEqual(payload.checks.database.status, 'up');
    assert.strictEqual(payload.checks.vector_store.status, 'down');
  });

  await t.test('getHealthStatus returns status unhealthy (HTTP 503) when database is down', async () => {
    const mockDb = {
      query: async () => {
        throw new Error('Postgres offline');
      },
    };
    const mockVectorStore = { describeIndexStats: async () => ({}) };

    const { httpStatus, payload } = await getHealthStatus({
      db: mockDb,
      vectorStore: mockVectorStore,
      version: '1.0.0',
    });

    assert.strictEqual(httpStatus, 503);
    assert.strictEqual(payload.status, 'unhealthy');
    assert.strictEqual(payload.checks.database.status, 'down');
  });

  await t.test('handleHealthRequest handles HTTP request and sets status code and JSON correctly', async () => {
    const mockDb = { query: async () => ({ rows: [] }) };
    const mockVectorStore = { describeIndexStats: async () => ({}) };

    let capturedCode = null;
    let capturedJson = null;
    const req = {};
    const res = {
      status: (code) => {
        capturedCode = code;
        return res;
      },
      json: (data) => {
        capturedJson = data;
        return res;
      },
    };

    await handleHealthRequest(req, res, {
      db: mockDb,
      vectorStore: mockVectorStore,
      version: '1.0.0',
    });

    assert.strictEqual(capturedCode, 200);
    assert.strictEqual(capturedJson.status, 'ok');
    assert.strictEqual(capturedJson.checks.database.status, 'up');
    assert.strictEqual(capturedJson.checks.vector_store.status, 'up');
  });

  await t.test('handleHealthRequest never leaks credentials, connection strings or stack traces on errors', async () => {
    const sensitiveError = new Error('FATAL: password authentication failed for "postgresql://myuser:s3cr3tP@ssw0rd@10.0.0.5:5432/myfetus"');
    sensitiveError.stack = 'Error at pg.connect (/app/node_modules/pg/client.js:123)';

    const mockDb = {
      query: async () => {
        throw sensitiveError;
      },
    };
    const mockVectorStore = {
      describeIndexStats: async () => {
        throw new Error('Pinecone API Key pcsk_secret_123456 invalid');
      },
    };

    let capturedCode = null;
    let capturedJson = null;
    const req = {};
    const res = {
      status: (code) => {
        capturedCode = code;
        return res;
      },
      json: (data) => {
        capturedJson = data;
        return res;
      },
    };

    await handleHealthRequest(req, res, {
      db: mockDb,
      vectorStore: mockVectorStore,
      version: '1.0.0',
    });

    assert.strictEqual(capturedCode, 503);
    const serialized = JSON.stringify(capturedJson);

    assert.ok(!serialized.includes('s3cr3tP@ssw0rd'));
    assert.ok(!serialized.includes('10.0.0.5'));
    assert.ok(!serialized.includes('pcsk_secret'));
    assert.ok(!serialized.includes('FATAL'));
    assert.ok(!serialized.includes('client.js'));
    assert.strictEqual(capturedJson.status, 'unhealthy');
    assert.strictEqual(capturedJson.checks.database.status, 'down');
    assert.strictEqual(capturedJson.checks.vector_store.status, 'down');
  });

  await t.test('handleHealthRequest safely ignores Express next function passed as 3rd parameter', async () => {
    const mockDb = { query: async () => ({ rows: [] }) };
    const mockVectorStore = { describeIndexStats: async () => ({}) };

    let capturedCode = null;
    let capturedJson = null;
    const req = {};
    const res = {
      status: (code) => {
        capturedCode = code;
        return res;
      },
      json: (data) => {
        capturedJson = data;
        return res;
      },
    };
    const expressNext = () => {};

    // Express calls route handlers as (req, res, next)
    await handleHealthRequest(req, res, expressNext);

    assert.ok(capturedCode === 200 || capturedCode === 503);
    assert.ok(capturedJson);
    assert.ok(capturedJson.status);
    assert.ok(capturedJson.checks);
  });

  await t.test('getHealthStatus isolates database acquisition error from vector store status', async () => {
    const mockVectorStore = { describeIndexStats: async () => ({}) };

    const { httpStatus, payload } = await getHealthStatus({
      db: null,
      vectorStore: mockVectorStore,
      version: '1.0.0',
    });

    assert.strictEqual(httpStatus, 503);
    assert.strictEqual(payload.status, 'unhealthy');
    assert.strictEqual(payload.checks.database.status, 'down');
    assert.strictEqual(payload.checks.vector_store.status, 'up');
  });
});

