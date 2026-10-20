const assert = require('assert');

process.env.PG_USER ||= 'myuser';
process.env.PG_HOST ||= '127.0.0.1';
process.env.PG_DATABASE ||= 'mydatabase';
process.env.PG_PASSWORD ||= 'mypassword';
process.env.PG_PORT ||= '1';

const db = require('../backend');
const {
  startDocumentTextExtractionWorker,
  stopDocumentTextExtractionWorker,
} = require('../services/documentExtractionWorker');

async function run() {
  const calls = [];
  let scheduled;
  const timer = { id: 'document-worker-test' };

  const processPending = async (batchSize) => {
    calls.push(batchSize);
  };

  const returnedTimer = startDocumentTextExtractionWorker({
    intervalMs: 1234,
    batchSize: 7,
    processPending,
    setIntervalFn(callback, delay) {
      scheduled = { callback, delay };
      return timer;
    },
  });

  assert.strictEqual(returnedTimer, timer);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepStrictEqual(calls, [7], 'o worker deve processar pendências no boot');
  assert.strictEqual(scheduled.delay, 1234);

  assert.strictEqual(
    startDocumentTextExtractionWorker({ processPending }),
    timer,
    'iniciar o worker novamente deve reutilizar o timer existente'
  );

  await scheduled.callback();
  assert.deepStrictEqual(calls, [7, 7]);

  let clearedTimer;
  assert.strictEqual(
    stopDocumentTextExtractionWorker({
      clearIntervalFn(value) {
        clearedTimer = value;
      },
    }),
    true
  );
  assert.strictEqual(clearedTimer, timer);
  assert.strictEqual(stopDocumentTextExtractionWorker(), false);

  await db.end();
  console.log('documentExtractionWorker: OK');
}

run().catch(async (error) => {
  console.error(error);
  await db.end().catch(() => {});
  process.exitCode = 1;
});
