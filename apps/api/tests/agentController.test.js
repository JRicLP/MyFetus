const test = require('node:test');
const assert = require('node:assert');
const Module = require('node:module');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

// Banco em memoria. Cada gestante carrega um marcador sigiloso para provar que
// dados de uma paciente nao vazam para quem nao tem vinculo com ela.
const PREGNANTS = {
  1: { id: 1, user_id: 5, patient_name: 'Paciente A', antecedentes: 'SIGILOSO-PACIENTE-A' },
  2: { id: 2, user_id: 6, patient_name: 'Paciente B', antecedentes: 'SIGILOSO-PACIENTE-B' },
};

// Medico 10: vinculado a gestante 1. Medico 11: vinculado a gestante 2.
// Medico 13: vinculo com a gestante 2 encerrado (inactive).
const LINKS = [
  { doctorId: 10, pregnantId: 1, status: 'active' },
  { doctorId: 11, pregnantId: 2, status: 'active' },
  { doctorId: 13, pregnantId: 2, status: 'inactive' },
];

// Consultas que leem o prontuario (dados clinicos) da gestante.
const CLINICAL_SQL = [
  /SELECT p\.\*/,
  /FROM pregnancies\s+WHERE pregnant_id/,
  /FROM pregnancy_events/,
];

const queryLog = [];

const clientMock = {
  query: async (sql, params = []) => {
    queryLog.push({ sql, params });

    if (sql.includes('doctor_patient_links')) {
      const [doctorId, pregnantId] = params.map(Number);
      const onlyActive = sql.includes("status = 'active'");
      const linked = LINKS.some(
        (link) =>
          link.doctorId === doctorId &&
          link.pregnantId === pregnantId &&
          (!onlyActive || link.status === 'active')
      );
      return { rows: linked ? [{ '?column?': 1 }] : [] };
    }

    const pregnant = PREGNANTS[Number(params[0])];

    if (/SELECT id, user_id\s+FROM pregnants/.test(sql)) {
      return { rows: pregnant ? [{ id: pregnant.id, user_id: pregnant.user_id }] : [] };
    }
    if (/SELECT p\.\*/.test(sql)) {
      return { rows: pregnant ? [{ ...pregnant }] : [] };
    }
    if (/FROM pregnancies\s+WHERE pregnant_id/.test(sql)) {
      return { rows: pregnant ? [{ id: 100 + pregnant.id, pregnant_id: pregnant.id }] : [] };
    }
    return { rows: [] };
  },
};

const decryptMock = test.mock.fn((row, pregnancy, events) => ({ ...row, pregnancy, events }));
const generationServiceMock = {
  generateMaternalAgentAnalysis: test.mock.fn(async () => 'Análise simulada pelo agente'),
};
const embeddingMock = { generateEmbedding: test.mock.fn(async () => [0.1]) };

const mocks = {
  '../backend': clientMock,
  '../services/clinicalDataService': { decryptPregnantDetails: decryptMock },
  '../utils/ragRetrieval': {
    semanticSearch: async () => ({
      resultados: [{ fonte: 'FEBRASGO', trecho: 'Diretriz de teste' }],
    }),
  },
  '../services/generationService': generationServiceMock,
  '../services/embeddingService': embeddingMock,
  '../services/vectorStoreService': {
    queryVectors: async () => ({
      matches: [{ id: 'c1', metadata: { text: 'Diretriz' }, values: [0.1] }],
    }),
  },
};

const originalRequire = Module.prototype.require;
Module.prototype.require = function (request) {
  if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
  return originalRequire.apply(this, arguments);
};

const agentRoutes = require('../routes/agent');

function tokenFor(user, secret = process.env.JWT_SECRET) {
  return `Bearer ${jwt.sign(user, secret)}`;
}

function resetRecorders() {
  queryLog.length = 0;
  decryptMock.mock.resetCalls();
  embeddingMock.generateEmbedding.mock.resetCalls();
  generationServiceMock.generateMaternalAgentAnalysis.mock.resetCalls();
}

function clinicalQueries() {
  return queryLog.filter((q) => CLINICAL_SQL.some((pattern) => pattern.test(q.sql)));
}

function linkQueries() {
  return queryLog.filter((q) => q.sql.includes('doctor_patient_links'));
}

// Garante que nenhum dado clinico foi lido, descriptografado ou enviado ao LLM.
function assertNoClinicalDataAccessed() {
  assert.deepStrictEqual(clinicalQueries(), []);
  assert.strictEqual(decryptMock.mock.callCount(), 0);
  assert.strictEqual(embeddingMock.generateEmbedding.mock.callCount(), 0);
  assert.strictEqual(generationServiceMock.generateMaternalAgentAnalysis.mock.callCount(), 0);
}

function patientDataSentToAgent() {
  const [call] = generationServiceMock.generateMaternalAgentAnalysis.mock.calls;
  return call.arguments[2];
}

test.describe('POST /api/agent/maternal-analysis - autorizacao', () => {
  let server;
  let baseUrl;

  test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/agent', agentRoutes);
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/api/agent/maternal-analysis`;
  });

  test.after(() => {
    Module.prototype.require = originalRequire;
    server.close();
  });

  test.beforeEach(resetRecorders);

  async function post(body, authorization) {
    const headers = { 'Content-Type': 'application/json' };
    if (authorization) headers.Authorization = authorization;
    return fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(body) });
  }

  test.describe('autenticacao', () => {
    test('retorna 401 sem token', async () => {
      const res = await post({ patientId: 1, query: 'pressao alta' });
      assert.strictEqual(res.status, 401);
      assert.deepStrictEqual(queryLog, []);
    });

    test('retorna 401 com token malformado', async () => {
      const res = await post({ patientId: 1, query: 'pressao alta' }, 'Bearer token-falso');
      assert.strictEqual(res.status, 401);
      assert.deepStrictEqual(queryLog, []);
    });

    test('retorna 401 com token assinado por outro segredo', async () => {
      const res = await post(
        { patientId: 1, query: 'pressao alta' },
        tokenFor({ id: 10, role: 'medico' }, 'segredo-de-atacante')
      );
      assert.strictEqual(res.status, 401);
      assert.deepStrictEqual(queryLog, []);
    });

    test('retorna 401 com token expirado', async () => {
      const expired = tokenFor({
        id: 10,
        role: 'medico',
        exp: Math.floor(Date.now() / 1000) - 60,
      });
      const res = await post({ patientId: 1, query: 'pressao alta' }, expired);
      assert.strictEqual(res.status, 401);
      assert.deepStrictEqual(queryLog, []);
    });
  });

  test.describe('papel (RBAC)', () => {
    test('retorna 403 para gestante, mesmo sendo dona do registro', async () => {
      const res = await post(
        { patientId: 1, query: 'pressao alta' },
        tokenFor({ id: 5, role: 'gestante' })
      );
      assert.strictEqual(res.status, 403);
      assert.deepStrictEqual(queryLog, []);
      assertNoClinicalDataAccessed();
    });

    test('retorna 403 para papel desconhecido', async () => {
      const res = await post(
        { patientId: 1, query: 'pressao alta' },
        tokenFor({ id: 7, role: 'enfermeiro' })
      );
      assert.strictEqual(res.status, 403);
      assert.deepStrictEqual(queryLog, []);
    });
  });

  test.describe('vinculo medico-gestante (IDOR)', () => {
    test('medico vinculado a gestante 1 nao le a gestante 2 trocando o patientId', async () => {
      const doctor = tokenFor({ id: 10, role: 'medico' });

      // Acesso legitimo ao proprio paciente funciona...
      const own = await post({ patientId: 1, query: 'pressao alta' }, doctor);
      assert.strictEqual(own.status, 200);

      // ...mas trocar o ID para outra gestante e bloqueado antes de ler o prontuario.
      for (const patientId of [2, '2']) {
        resetRecorders();

        const res = await post({ patientId, query: 'pressao alta' }, doctor);
        const text = await res.text();

        assert.strictEqual(res.status, 403);
        assert.ok(!text.includes('SIGILOSO-PACIENTE-B'));
        assert.ok(!text.includes('Paciente B'));
        assertNoClinicalDataAccessed();

        // A decisao foi tomada consultando o vinculo ativo do medico com a gestante 2.
        const [linkCheck] = linkQueries();
        assert.deepStrictEqual(linkCheck.params.map(Number), [10, 2]);
        assert.ok(linkCheck.sql.includes("status = 'active'"));
      }
    });

    test('medico recebe a mesma resposta para ID sem vinculo e ID inexistente (sem enumeracao)', async () => {
      const doctor = tokenFor({ id: 10, role: 'medico' });

      const withoutLink = await post({ patientId: 2, query: 'pressao alta' }, doctor);
      const withoutLinkBody = await withoutLink.json();

      resetRecorders();
      const missing = await post({ patientId: 999, query: 'pressao alta' }, doctor);
      const missingBody = await missing.json();

      assert.strictEqual(withoutLink.status, 403);
      assert.strictEqual(missing.status, 403);
      assert.deepStrictEqual(missingBody, withoutLinkBody);

      // A existencia da gestante nao e consultada antes do vinculo.
      assert.ok(!queryLog.some((q) => /FROM pregnants/.test(q.sql)));
      assertNoClinicalDataAccessed();
    });

    test('retorna 403 para medico com vinculo inativo', async () => {
      const res = await post(
        { patientId: 2, query: 'pressao alta' },
        tokenFor({ id: 13, role: 'medico' })
      );
      assert.strictEqual(res.status, 403);
      assertNoClinicalDataAccessed();
    });

    test('permite medico vinculado e envia ao agente apenas os dados da propria gestante', async () => {
      const res = await post(
        { patientId: 2, query: 'pressao alta' },
        tokenFor({ id: 11, role: 'medico' })
      );
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.analysis, 'Análise simulada pelo agente');

      const queries = clinicalQueries();
      assert.strictEqual(queries.length, 3);
      queries.forEach((q) => assert.deepStrictEqual(q.params, [2]));

      const patientData = patientDataSentToAgent();
      assert.strictEqual(patientData.id, 2);
      assert.ok(!JSON.stringify(patientData).includes('SIGILOSO-PACIENTE-A'));
    });
  });

  test.describe('admin', () => {
    test('permite admin acessar qualquer gestante', async () => {
      const res = await post(
        { patientId: 2, query: 'pressao alta' },
        tokenFor({ id: 1, role: 'admin' })
      );
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(linkQueries(), []);
      assert.strictEqual(patientDataSentToAgent().id, 2);
    });

    test('retorna 404 para gestante inexistente sem ler dados clinicos', async () => {
      const res = await post(
        { patientId: 999, query: 'pressao alta' },
        tokenFor({ id: 1, role: 'admin' })
      );
      assert.strictEqual(res.status, 404);
      assertNoClinicalDataAccessed();
    });
  });

  test.describe('validacao de entrada', () => {
    test('retorna 400 para patientId invalido', async () => {
      const res = await post(
        { patientId: '1 OR 1=1', query: 'pressao alta' },
        tokenFor({ id: 10, role: 'medico' })
      );
      assert.strictEqual(res.status, 400);
      assert.deepStrictEqual(queryLog, []);
    });

    test('retorna 400 sem query', async () => {
      const res = await post({ patientId: 1 }, tokenFor({ id: 10, role: 'medico' }));
      assert.strictEqual(res.status, 400);
      assert.deepStrictEqual(queryLog, []);
    });
  });
});
