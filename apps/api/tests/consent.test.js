const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

process.env.JWT_SECRET = 'consent-test-secret';
// Vários cadastros na mesma suíte: o limite de cadastro (5/15 min) não é o alvo destes testes.
process.env.REGISTER_RATE_LIMIT_MAX = '1000';

const { CONSENT_PURPOSES, getRequiredPurposes } = require('../config/consentPolicy');

const version = (purpose) => CONSENT_PURPOSES[purpose].version;
const ref = (purpose) => ({ purpose, version: version(purpose) });
const GESTANTE_REQUIRED = getRequiredPurposes('gestante');
const MEDICO_REQUIRED = getRequiredPurposes('medico');

const VALID_SIGNUP = {
  name: 'Maria Exemplo',
  email: 'maria.exemplo@example.com',
  password: 'senha-sintetica-123',
  birthdate: '1995-04-12',
  consents: GESTANTE_REQUIRED,
};
const VALID_DOCTOR = {
  name: 'Dra. Ana Exemplo',
  email: 'ana.medica@example.com',
  password: 'senha-sintetica-123',
  birthdate: '1985-08-20',
  crm: '000000',
  crm_estado: 'PE',
  consents: MEDICO_REQUIRED,
};

// ---------------------------------------------------------------- banco fake
// Simula transação: inserts após BEGIN só valem no COMMIT; ROLLBACK descarta.
const db = {
  users: [],
  consents: [],
  log: [],
  staged: null,
  failConsentInsert: false,
  failConsentRead: false,
  nextUserId: 100,
  nextConsentId: 1,
  reset() {
    Object.assign(this, { users: [], consents: [], log: [], staged: null, failConsentInsert: false, failConsentRead: false });
  },
  table(name) {
    return this.staged ? this.staged[name] : this[name];
  },
  async query(sql, params = []) {
    this.log.push(sql.trim().split(/\s+/).slice(0, 3).join(' '));

    if (sql === 'BEGIN') {
      this.staged = { users: [...this.users], consents: [...this.consents] };
      return { rows: [] };
    }
    if (sql === 'COMMIT') {
      Object.assign(this, { users: this.staged.users, consents: this.staged.consents, staged: null });
      return { rows: [] };
    }
    if (sql === 'ROLLBACK') {
      this.staged = null;
      return { rows: [] };
    }
    if (/INSERT INTO users/.test(sql)) {
      const row = { id: this.nextUserId++, name: params[0], email: params[1], password: params[2], birthdate: params[3], is_active: params[4], role: params[5], email_lookup_hash: params[6] };
      this.table('users').push(row);
      return { rows: [row] };
    }
    if (/INSERT INTO (pregnants|doctors)/.test(sql)) return { rows: [{ id: 1, user_id: params[0] }] };
    if (/INSERT INTO consents/.test(sql)) {
      if (this.failConsentInsert) throw new Error('falha simulada ao gravar consentimento');
      const [userId, purpose, ver, decision, ipAddress, userAgent] = params;
      const row = { id: this.nextConsentId++, user_id: userId, purpose, version: ver, decision, ip_address: ipAddress, user_agent: userAgent, created_at: new Date() };
      this.table('consents').push(row);
      return { rows: [row] };
    }
    if (/FROM consents/.test(sql)) {
      if (this.failConsentRead) throw new Error('relation "consents" does not exist');
      const latest = new Map();
      for (const row of this.table('consents').filter((item) => item.user_id === params[0])) {
        latest.set(row.purpose, row);
      }
      return { rows: [...latest.values()] };
    }
    if (/WHERE u\.email_lookup_hash = \$1/.test(sql)) {
      const user = this.users.find((item) => item.email_lookup_hash === params[0]);
      return { rows: user ? [{ ...user, pregnant_id: 1 }] : [] };
    }
    return { rows: [] };
  },
};

const auditEvents = [];
const mocks = {
  '../backend': {
    query: (...args) => db.query(...args),
    connect: async () => ({ query: (...args) => db.query(...args), release() {} }),
  },
  '../services/cryptoService': {
    encryptRecord: (record) => record,
    decryptRecord: (record) => record,
    getCurrentVersion: () => 1,
  },
  '../services/emailLookupService': {
    hashEmail: (email) => `hash:${email}`,
    hashDoctorCrm: (crm, state) => `crm:${crm}:${state}`,
    normalizeCrm: (crm) => String(crm).trim().toUpperCase().replace(/[^A-Z0-9]/g, ''),
    normalizeCrmState: (state) => String(state).trim().toUpperCase(),
    normalizeEmail: (email) => String(email).trim().toLowerCase(),
  },
  '../services/auditService': {
    audit: (req, event) => auditEvents.push(event),
    buildAuditEntry: () => ({ ip_address: '203.0.113.10', user_agent: 'teste-sintetico' }),
  },
  '../utils/logger': { error() {}, warn() {}, info() {}, request() {} },
};

const originalLoad = Module._load;
Module._load = function (request) {
  if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
  return originalLoad.apply(this, arguments);
};
const userRoutes = require('../routes/users');
const doctorRoutes = require('../routes/doctors');
const consentRoutes = require('../routes/consents');
const { getConsentStatus } = require('../services/consentService');
Module._load = originalLoad;

const tokenFor = (user) => `Bearer ${jwt.sign(user, process.env.JWT_SECRET)}`;
const consentRows = () => db.consents.map(({ user_id, purpose, decision }) => `${user_id}:${purpose}:${decision}`);

test.describe('Consentimento versionado (E7-01.1)', () => {
  let server;
  let baseUrl;

  test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/users', userRoutes);
    app.use('/api/doctors', doctorRoutes);
    app.use('/api/consents', consentRoutes);
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  });

  test.after(() => server.close());
  test.beforeEach(() => {
    db.reset();
    auditEvents.length = 0;
  });

  async function call(method, path, { body, auth } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) headers.Authorization = auth;
    const res = await fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json() };
  }

  test.describe('política vigente (GET /consents/policy)', () => {
    test('separa termos (aceite), política (ciência) e consentimentos, por perfil', async () => {
      const all = await call('GET', '/consents/policy');
      const gestante = await call('GET', '/consents/policy?role=gestante');
      const medico = await call('GET', '/consents/policy?role=medico');

      assert.equal(all.status, 200);
      const byPurpose = Object.fromEntries(all.body.purposes.map((item) => [item.purpose, item]));
      assert.equal(byPurpose.termos_de_uso_gestante.kind, 'acceptance');
      assert.equal(byPurpose.politica_de_privacidade.kind, 'acknowledgment');
      assert.equal(byPurpose.tratamento_dados_saude.kind, 'consent');
      assert.equal(byPurpose.tratamento_dados_saude.highlighted, true);
      assert.equal(byPurpose.uso_ia.required, false);
      assert.equal(byPurpose.pesquisa_usabilidade.required, false);
      assert.match(byPurpose.politica_de_privacidade.text, /RASCUNHO/);
      assert.ok(byPurpose.politica_de_privacidade.document_date);

      assert.deepEqual(gestante.body.purposes.map((item) => item.purpose).sort(), [
        'pesquisa_usabilidade', 'politica_de_privacidade', 'termos_de_uso_gestante', 'tratamento_dados_saude', 'uso_ia',
      ]);
      assert.deepEqual(medico.body.purposes.map((item) => item.purpose).sort(), [
        'pesquisa_usabilidade', 'politica_de_privacidade', 'termos_de_uso_medico',
      ]);
      assert.equal((await call('GET', '/consents/policy?role=admin')).status, 400);
    });
  });

  test.describe('cadastro da gestante (POST /users)', () => {
    test('sem os aceites obrigatórios, a conta não é criada', async () => {
      const res = await call('POST', '/users', { body: { ...VALID_SIGNUP, consents: [ref('termos_de_uso_gestante')] } });

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'CONSENT_REQUIRED');
      assert.equal(db.users.length, 0);
      assert.equal(db.log.includes('BEGIN'), false);
    });

    test('versão desatualizada é rejeitada (409) sem criar conta', async () => {
      const consents = GESTANTE_REQUIRED.map((item) => ({ ...item, version: '0.0-antiga' }));
      const res = await call('POST', '/users', { body: { ...VALID_SIGNUP, consents } });

      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'CONSENT_VERSION_OUTDATED');
      assert.equal(db.users.length, 0);
    });

    test('finalidade de outro perfil é rejeitada', async () => {
      const res = await call('POST', '/users', { body: { ...VALID_SIGNUP, consents: [...GESTANTE_REQUIRED, ref('termos_de_uso_medico')] } });
      assert.equal(res.status, 400);
      assert.equal(db.users.length, 0);
    });

    test('grava conta e aceites obrigatórios na mesma transação; opcionais só se enviados', async () => {
      const res = await call('POST', '/users', { body: VALID_SIGNUP });

      assert.equal(res.status, 201);
      const userId = db.users[0].id;
      assert.deepEqual(consentRows().sort(), GESTANTE_REQUIRED.map(({ purpose }) => `${userId}:${purpose}:accepted`).sort());
      assert.equal(db.consents.some((row) => row.purpose === 'uso_ia'), false);
      assert.ok(db.log.indexOf('BEGIN') < db.log.indexOf('INSERT INTO consents'));
      assert.ok(db.log.indexOf('INSERT INTO consents') < db.log.indexOf('COMMIT'));
      assert.equal(db.consents[0].ip_address, '203.0.113.10');
    });

    test('autorização opcional (IA) enviada no cadastro também é registrada', async () => {
      const res = await call('POST', '/users', { body: { ...VALID_SIGNUP, consents: [...GESTANTE_REQUIRED, ref('uso_ia')] } });
      assert.equal(res.status, 201);
      assert.ok(db.consents.some((row) => row.purpose === 'uso_ia' && row.decision === 'accepted'));
    });

    test('se o consentimento falha ao gravar, nem o usuário fica no banco (rollback)', async () => {
      db.failConsentInsert = true;
      const res = await call('POST', '/users', { body: VALID_SIGNUP });

      assert.equal(res.status, 500);
      assert.ok(db.log.includes('ROLLBACK'));
      assert.equal(db.users.length, 0);
      assert.equal(db.consents.length, 0);
    });
  });

  test.describe('cadastro do médico (POST /doctors)', () => {
    test('exige termos do perfil médico e ciência da política', async () => {
      const without = await call('POST', '/doctors', { body: { ...VALID_DOCTOR, consents: [] } });
      assert.equal(without.status, 400);
      assert.equal(without.body.code, 'CONSENT_REQUIRED');

      const withPatientTerms = await call('POST', '/doctors', { body: { ...VALID_DOCTOR, consents: [...MEDICO_REQUIRED, ref('tratamento_dados_saude')] } });
      assert.equal(withPatientTerms.status, 400);
      assert.equal(db.users.length, 0);
    });

    test('com os aceites do perfil, grava médico e aceites na mesma transação', async () => {
      const res = await call('POST', '/doctors', { body: VALID_DOCTOR });

      assert.equal(res.status, 201);
      const userId = db.users[0].id;
      assert.equal(db.users[0].role, 'medico');
      assert.deepEqual(consentRows().sort(), MEDICO_REQUIRED.map(({ purpose }) => `${userId}:${purpose}:accepted`).sort());
    });
  });

  test.describe('aceite, recusa e revogação (POST /consents)', () => {
    const gestante = tokenFor({ id: 7, role: 'gestante' });
    const medico = tokenFor({ id: 9, role: 'medico' });

    test('exige JWT', async () => {
      assert.equal((await call('GET', '/consents/me')).status, 401);
      assert.equal((await call('POST', '/consents', { body: { purpose: 'uso_ia', decision: 'accepted', version: version('uso_ia') } })).status, 401);
    });

    test('revogar o uso de IA muda o estado sem apagar o aceite anterior', async () => {
      await call('POST', '/consents', { auth: gestante, body: { purpose: 'uso_ia', decision: 'accepted', version: version('uso_ia') } });
      const res = await call('POST', '/consents', { auth: gestante, body: { purpose: 'uso_ia', decision: 'revoked' } });

      assert.equal(res.status, 201);
      assert.equal(res.body.status.purposes.find((item) => item.purpose === 'uso_ia').status, 'revoked');
      assert.deepEqual(consentRows(), ['7:uso_ia:accepted', '7:uso_ia:revoked']);
      assert.ok(auditEvents.some((event) => event.action === 'CONSENT_REVOKED'));
    });

    test('revogar o consentimento opcional não torna obrigatório nenhum termo', async () => {
      for (const item of GESTANTE_REQUIRED) {
        await call('POST', '/consents', { auth: gestante, body: { ...item, decision: 'accepted' } });
      }
      const res = await call('POST', '/consents', { auth: gestante, body: { purpose: 'uso_ia', decision: 'revoked' } });
      assert.equal(res.body.status.required, false);
    });

    test('revogar o consentimento de dados de saúde volta a exigi-lo', async () => {
      for (const item of GESTANTE_REQUIRED) {
        await call('POST', '/consents', { auth: gestante, body: { ...item, decision: 'accepted' } });
      }
      const res = await call('POST', '/consents', { auth: gestante, body: { purpose: 'tratamento_dados_saude', decision: 'revoked' } });
      assert.equal(res.body.status.required, true);
      assert.deepEqual(res.body.status.pending, [ref('tratamento_dados_saude')]);
    });

    test('ciência da política não é "revogável" e termos não são "revogados", apenas recusados', async () => {
      const revokePolicy = await call('POST', '/consents', { auth: gestante, body: { purpose: 'politica_de_privacidade', decision: 'revoked' } });
      const revokeTerms = await call('POST', '/consents', { auth: gestante, body: { purpose: 'termos_de_uso_gestante', decision: 'revoked' } });
      const refuseTerms = await call('POST', '/consents', { auth: gestante, body: { purpose: 'termos_de_uso_gestante', decision: 'refused', version: version('termos_de_uso_gestante') } });

      assert.equal(revokePolicy.status, 400);
      assert.equal(revokeTerms.status, 400);
      assert.equal(refuseTerms.status, 201);
    });

    test('médico não decide finalidades da gestante (o aceite dele não substitui o dela)', async () => {
      const res = await call('POST', '/consents', { auth: medico, body: { purpose: 'tratamento_dados_saude', decision: 'accepted', version: version('tratamento_dados_saude') } });
      assert.equal(res.status, 400);
      assert.equal(db.consents.length, 0);
    });

    test('o titular é sempre o usuário do token, mesmo enviando outro user_id (IDOR)', async () => {
      await call('POST', '/consents', {
        auth: gestante,
        body: { purpose: 'uso_ia', decision: 'accepted', version: version('uso_ia'), user_id: 999, userId: 999 },
      });
      assert.deepEqual(consentRows(), ['7:uso_ia:accepted']);

      const other = await call('GET', '/consents/me', { auth: tokenFor({ id: 8, role: 'gestante' }) });
      assert.equal(other.body.purposes.find((item) => item.purpose === 'uso_ia').status, 'pending');
    });

    test('rejeita versão antiga, decisão inválida e finalidade desconhecida sem gravar', async () => {
      const outdated = await call('POST', '/consents', { auth: gestante, body: { purpose: 'uso_ia', decision: 'accepted', version: '0.0-antiga' } });
      const badDecision = await call('POST', '/consents', { auth: gestante, body: { purpose: 'uso_ia', decision: 'talvez', version: version('uso_ia') } });
      const badPurpose = await call('POST', '/consents', { auth: gestante, body: { purpose: 'marketing', decision: 'accepted', version: '1' } });

      assert.deepEqual([outdated.status, badDecision.status, badPurpose.status], [409, 400, 400]);
      assert.equal(db.consents.length, 0);
    });
  });

  test.describe('nova versão exige novo aceite', () => {
    test('aceite de versão anterior fica "outdated" e volta a ser exigido', async () => {
      db.consents.push(
        ...GESTANTE_REQUIRED.map((item, index) => ({ id: index + 1, user_id: 7, ...item, decision: 'accepted', created_at: new Date() })),
        { id: 10, user_id: 7, purpose: 'politica_de_privacidade', version: '0.0-antiga', decision: 'accepted', created_at: new Date() }
      );
      const status = await getConsentStatus(db, { userId: 7, role: 'gestante' });

      assert.equal(status.purposes.find((item) => item.purpose === 'politica_de_privacidade').status, 'outdated');
      assert.equal(status.required, true);
      assert.deepEqual(status.pending, [ref('politica_de_privacidade')]);
    });

    test('o status mostra só as finalidades do perfil', async () => {
      const status = await getConsentStatus(db, { userId: 9, role: 'medico' });
      assert.deepEqual(status.purposes.map((item) => item.purpose).sort(), ['pesquisa_usabilidade', 'politica_de_privacidade', 'termos_de_uso_medico']);
      assert.equal(status.required, true);
    });
  });

  test.describe('login informa documentos pendentes', () => {
    async function seedUser(accepted) {
      const hash = await bcrypt.hash('senha-sintetica-123', 4);
      db.users.push({ id: 7, name: 'Maria', email: 'maria.exemplo@example.com', password: hash, is_active: true, role: 'gestante', email_lookup_hash: 'hash:maria.exemplo@example.com' });
      accepted.forEach((item, index) => db.consents.push({ id: index + 1, user_id: 7, ...item, decision: 'accepted', created_at: new Date() }));
    }
    const login = () => call('POST', '/users/login', { body: { email: 'maria.exemplo@example.com', password: 'senha-sintetica-123' } });

    test('com todos os aceites vigentes, consent.required é false', async () => {
      await seedUser(GESTANTE_REQUIRED);
      const res = await login();
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.consent, { required: false, pending: [] });
    });

    test('com documento em versão anterior, o login sinaliza o novo aceite', async () => {
      await seedUser(GESTANTE_REQUIRED.map((item) => (item.purpose === 'termos_de_uso_gestante' ? { ...item, version: '0.0-antiga' } : item)));
      const res = await login();
      assert.deepEqual(res.body.consent, { required: true, pending: [ref('termos_de_uso_gestante')] });
    });

    test('se o status não puder ser lido, o login continua funcionando', async () => {
      await seedUser(GESTANTE_REQUIRED);
      db.failConsentRead = true;
      const res = await login();
      assert.equal(res.status, 200);
      assert.equal(res.body.consent, null);
      assert.ok(res.body.token);
    });
  });
});
