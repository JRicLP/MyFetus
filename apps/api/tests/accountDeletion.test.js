const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

process.env.JWT_SECRET = 'account-deletion-test-secret';
process.env.AES_KEY_VERSION = '1';
process.env.AES_ENCRYPTION_KEY_V1 = crypto.randomBytes(32).toString('hex');
// Várias exclusões na mesma suíte: o limite (5/15 min) não é o alvo destes testes.
process.env.ACCOUNT_DELETION_RATE_LIMIT_MAX = '1000';

const cryptoService = require('../services/cryptoService');
const { ANONYMIZED_NAME, anonymizedEmail } = require('../services/accountDeletionService');

const PASSWORD = 'senha-sintetica-123';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);
const CONFIRM = { password: PASSWORD, confirmation: 'EXCLUIR' };

const enc = (record, table) => cryptoService.encryptRecord(record, table);
const clone = (value) => structuredClone(value);

// ------------------------------------------------------------ arquivos reais
// Os exames ficam numa pasta temporária, para conferir a remoção no disco.
let uploadDir;
const fileOf = (name) => path.join(uploadDir, name);

function writeExamFiles() {
  fs.rmSync(uploadDir, { recursive: true, force: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(fileOf('maria.mfe'), 'cifrado-maria');
  fs.writeFileSync(fileOf('joana.mfe'), 'cifrado-joana');
}

// ------------------------------------------------------------ banco sintético
function seed() {
  return {
    users: [
      { id: 1, ...enc({ name: 'Maria Sintetica', email: 'maria@example.com', birthdate: '1995-04-12' }, 'users'), role: 'gestante', is_active: true, password: PASSWORD_HASH, email_lookup_hash: 'a'.repeat(64) },
      { id: 2, ...enc({ name: 'Joana Sintetica', email: 'joana@example.com', birthdate: '1990-01-30' }, 'users'), role: 'gestante', is_active: true, password: PASSWORD_HASH, email_lookup_hash: 'b'.repeat(64) },
      { id: 3, ...enc({ name: 'Dra Ana Sintetica', email: 'ana@example.com', birthdate: '1985-08-20' }, 'users'), role: 'medico', is_active: true, password: PASSWORD_HASH, email_lookup_hash: 'c'.repeat(64) },
      { id: 4, ...enc({ name: 'Admin Sintetico', email: 'admin@example.com', birthdate: '1980-01-01' }, 'users'), role: 'admin', is_active: true, password: PASSWORD_HASH, email_lookup_hash: 'd'.repeat(64) },
    ],
    doctors: [{ id: 7, user_id: 3, ...enc({ crm: '000001', crm_estado: 'PE', telefone: '81900000000' }, 'doctors'), especialidade: 'Obstetricia' }],
    pregnants: [{ id: 10, user_id: 1 }, { id: 20, user_id: 2 }],
    pregnancies: [{ id: 100, pregnant_id: 10 }, { id: 200, pregnant_id: 20 }],
    pregnant_documents: [
      { id: 900, pregnant_id: 10, file_path: null },
      { id: 901, pregnant_id: 20, file_path: null },
    ],
    doctor_patient_links: [
      { id: 1, doctor_id: 3, pregnant_id: 10, status: 'active' },
      { id: 2, doctor_id: 3, pregnant_id: 20, status: 'active' },
    ],
    consents: [
      { id: 1, user_id: 1, purpose: 'tratamento_dados_saude', decision: 'accepted' },
      { id: 2, user_id: 3, purpose: 'termos_de_uso_medico', decision: 'accepted' },
    ],
  };
}

const db = {
  tables: null,
  snapshot: null,
  log: [],
  failOn: null,
  reset() {
    this.tables = seed();
    this.tables.pregnant_documents[0].file_path = fileOf('maria.mfe');
    this.tables.pregnant_documents[1].file_path = fileOf('joana.mfe');
    this.snapshot = null;
    this.log = [];
    this.failOn = null;
  },
  // Cascata igual à do schema: users -> pregnants -> gestações, documentos e vínculos.
  deleteUserCascade(userId) {
    const t = this.tables;
    const pregnantIds = t.pregnants.filter((row) => row.user_id === userId).map((row) => row.id);
    t.users = t.users.filter((row) => row.id !== userId);
    t.doctors = t.doctors.filter((row) => row.user_id !== userId);
    t.pregnants = t.pregnants.filter((row) => row.user_id !== userId);
    t.pregnancies = t.pregnancies.filter((row) => !pregnantIds.includes(row.pregnant_id));
    t.pregnant_documents = t.pregnant_documents.filter((row) => !pregnantIds.includes(row.pregnant_id));
    t.doctor_patient_links = t.doctor_patient_links.filter((row) => (
      !pregnantIds.includes(row.pregnant_id) && row.doctor_id !== userId
    ));
  },
  async query(sql, params = []) {
    const text = sql.replace(/\s+/g, ' ').trim();
    this.log.push(text);
    if (this.failOn && text.includes(this.failOn)) throw new Error('falha simulada');

    if (text === 'BEGIN') { this.snapshot = clone(this.tables); return { rows: [] }; }
    if (text === 'COMMIT') { this.snapshot = null; return { rows: [] }; }
    if (text === 'ROLLBACK') {
      if (this.snapshot) this.tables = this.snapshot;
      this.snapshot = null;
      return { rows: [] };
    }

    const t = this.tables;
    const [userId] = params;
    if (text === 'SELECT password, is_active FROM users WHERE id = $1') {
      return { rows: t.users.filter((row) => row.id === userId) };
    }
    if (text === 'SELECT role FROM users WHERE id = $1 FOR UPDATE') {
      return { rows: t.users.filter((row) => row.id === userId).map(({ role }) => ({ role })) };
    }
    if (text.startsWith('SELECT d.file_path FROM pregnant_documents d')) {
      const ids = t.pregnants.filter((row) => row.user_id === userId).map((row) => row.id);
      return { rows: t.pregnant_documents.filter((row) => ids.includes(row.pregnant_id) && row.file_path) };
    }
    if (text.startsWith('SELECT (SELECT COUNT(*) FROM pregnancies')) {
      const ids = t.pregnants.filter((row) => row.user_id === userId).map((row) => row.id);
      return { rows: [{
        gestacoes: t.pregnancies.filter((row) => ids.includes(row.pregnant_id)).length,
        documentos: t.pregnant_documents.filter((row) => ids.includes(row.pregnant_id)).length,
      }] };
    }
    if (text === 'DELETE FROM users WHERE id = $1') {
      this.deleteUserCascade(userId);
      return { rows: [] };
    }
    if (text === 'DELETE FROM doctor_patient_links WHERE doctor_id = $1 RETURNING id') {
      const removed = t.doctor_patient_links.filter((row) => row.doctor_id === userId);
      t.doctor_patient_links = t.doctor_patient_links.filter((row) => row.doctor_id !== userId);
      return { rows: removed.map(({ id }) => ({ id })) };
    }
    if (text.startsWith('UPDATE users SET name = $2')) {
      const user = t.users.find((row) => row.id === userId);
      Object.assign(user, {
        name: params[1], email: params[2], birthdate: params[3], password: params[4],
        email_lookup_hash: null, is_active: false, encryption_key_version: params[5],
      });
      return { rows: [] };
    }
    if (text.startsWith('UPDATE doctors SET crm = $2')) {
      const doctor = t.doctors.find((row) => row.user_id === userId);
      Object.assign(doctor, { crm: params[1], crm_estado: params[2], telefone: null, especialidade: null });
      return { rows: [] };
    }
    throw new Error(`SQL inesperado no teste: ${text}`);
  },
};

const auditEvents = [];
const mocks = {
  '../backend': {
    query: (...args) => db.query(...args),
    connect: async () => ({ query: (...args) => db.query(...args), release() {} }),
  },
  '../services/auditService': {
    audit: (req, event) => auditEvents.push(event),
  },
  '../utils/logger': { error() {}, warn() {}, info() {}, request() {} },
};

const originalLoad = Module._load;
Module._load = function (request) {
  if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
  return originalLoad.apply(this, arguments);
};
const privacyRoutes = require('../routes/privacy');
const { isConsentExempt } = require('../middlewares/consent');
Module._load = originalLoad;

const tokenFor = (user) => `Bearer ${jwt.sign(user, process.env.JWT_SECRET)}`;
const MARIA = tokenFor({ id: 1, role: 'gestante' });
const MEDICA = tokenFor({ id: 3, role: 'medico' });
const ADMIN = tokenFor({ id: 4, role: 'admin' });

const ids = (table) => db.tables[table].map((row) => row.id);
const leftoverTombstones = () => fs.readdirSync(uploadDir).filter((name) => name.includes('.delete-'));

test.describe('Exclusão da conta pelo titular (E7-02)', () => {
  let server;
  let baseUrl;

  test.before(async () => {
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'myfetus-delete-'));
    const app = express();
    app.use(express.json());
    app.use('/api/privacy', privacyRoutes);
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/api/privacy`;
  });

  test.after(() => {
    server.close();
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  test.beforeEach(() => {
    writeExamFiles();
    db.reset();
    auditEvents.length = 0;
  });

  async function deleteAs(auth, body = CONFIRM) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) headers.Authorization = auth;
    const res = await fetch(`${baseUrl}/delete`, { method: 'POST', headers, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  }

  test('gestante: apaga a conta e os dados em cascata, e remove o arquivo do exame', async () => {
    const res = await deleteAs(MARIA);

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { message: 'Conta excluída', mode: 'deleted' });
    assert.deepEqual(ids('users'), [2, 3, 4]);
    assert.deepEqual(ids('pregnants'), [20]);
    assert.deepEqual(ids('pregnancies'), [200]);
    assert.deepEqual(ids('pregnant_documents'), [901]);
    assert.deepEqual(ids('doctor_patient_links'), [2]);
    assert.equal(fs.existsSync(fileOf('maria.mfe')), false);
    assert.deepEqual(leftoverTombstones(), []);
  });

  test('gestante: não toca nos dados nem no arquivo de outra gestante (A contra B)', async () => {
    await deleteAs(MARIA, { ...CONFIRM, user_id: 2, id: 2 });

    assert.ok(ids('users').includes(2));
    assert.equal(fs.readFileSync(fileOf('joana.mfe'), 'utf8'), 'cifrado-joana');
  });

  test('consentimentos ficam guardados após a exclusão (resposta 4 da DPIA)', async () => {
    await deleteAs(MARIA);

    assert.deepEqual(db.tables.consents.map((row) => row.user_id), [1, 3]);
  });

  test('médico: conta anonimizada e desativada, sem vínculos, e pacientes intactas', async () => {
    const res = await deleteAs(MEDICA);

    assert.equal(res.status, 200);
    assert.equal(res.body.mode, 'anonymized');

    const user = cryptoService.decryptRecord(db.tables.users.find((row) => row.id === 3), 'users');
    assert.equal(user.name, ANONYMIZED_NAME);
    assert.equal(user.email, anonymizedEmail(3));
    assert.equal(user.is_active, false);
    assert.equal(user.email_lookup_hash, null);
    assert.equal(await bcrypt.compare(PASSWORD, user.password), false);

    const doctor = cryptoService.decryptRecord(db.tables.doctors[0], 'doctors');
    assert.equal(doctor.crm, 'removido');
    assert.equal(doctor.telefone, null);
    assert.equal(doctor.especialidade, null);

    assert.deepEqual(db.tables.doctor_patient_links, []);
    assert.deepEqual(ids('pregnants'), [10, 20]);
    assert.ok(fs.existsSync(fileOf('maria.mfe')));
  });

  test('administrador não exclui a própria conta pelo app', async () => {
    const res = await deleteAs(ADMIN);

    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'ACCOUNT_DELETION_NOT_SELF_SERVICE');
    assert.ok(ids('users').includes(4));
    assert.ok(db.log.includes('ROLLBACK'));
  });

  test('senha errada responde 403 e não apaga nada', async () => {
    const res = await deleteAs(MARIA, { password: 'senha-errada', confirmation: 'EXCLUIR' });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'INVALID_PASSWORD');
    assert.ok(ids('users').includes(1));
    assert.ok(fs.existsSync(fileOf('maria.mfe')));
    assert.equal(db.log.includes('BEGIN'), false);
    assert.deepEqual(auditEvents.map(({ outcome, detail }) => [outcome, detail.reason]), [['FAILURE', 'invalid_password']]);
  });

  test('exige senha e a palavra EXCLUIR exata', async () => {
    const noPassword = await deleteAs(MARIA, { confirmation: 'EXCLUIR' });
    const noConfirmation = await deleteAs(MARIA, { password: PASSWORD });
    const lowercase = await deleteAs(MARIA, { password: PASSWORD, confirmation: 'excluir' });

    assert.equal(noPassword.body.code, 'PASSWORD_REQUIRED');
    for (const res of [noConfirmation, lowercase]) {
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'CONFIRMATION_REQUIRED');
    }
    assert.ok(ids('users').includes(1));
    assert.equal(db.log.length, 0);
  });

  test('falha no banco desfaz tudo e devolve o arquivo ao lugar', async () => {
    db.failOn = 'DELETE FROM users';
    const res = await deleteAs(MARIA);

    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: 'Erro ao excluir conta' });
    assert.ok(ids('users').includes(1));
    assert.ok(ids('pregnant_documents').includes(900));
    assert.equal(fs.readFileSync(fileOf('maria.mfe'), 'utf8'), 'cifrado-maria');
    assert.deepEqual(leftoverTombstones(), []);
    assert.equal(auditEvents.at(-1).detail.reason, 'internal_error');
  });

  test('depois de excluída, o mesmo token não consegue repetir a operação', async () => {
    await deleteAs(MARIA);
    const again = await deleteAs(MARIA);

    assert.equal(again.status, 403);
    assert.equal(again.body.code, 'INVALID_PASSWORD');
  });

  test('auditoria registra o modo e contagens, sem dado pessoal', async () => {
    await deleteAs(MARIA);

    const [event] = auditEvents;
    assert.equal(event.action, 'ACCOUNT_DELETED');
    assert.equal(event.outcome, 'SUCCESS');
    assert.deepEqual(event.detail, {
      role: 'gestante', mode: 'deleted', counts: { gestacoes: 1, documentos: 1 }, files_removed: 1, files_failed: 0,
    });
    assert.doesNotMatch(JSON.stringify(event), /Maria|maria@example\.com|maria\.mfe/);
  });

  test('sem token não exclui', async () => {
    const res = await deleteAs(null);
    assert.equal(res.status, 401);
    assert.ok(ids('users').includes(1));
  });

  test('a exclusão fica fora do bloqueio por consentimento', () => {
    assert.equal(isConsentExempt({ method: 'POST', path: '/api/privacy/delete' }), true);
    assert.equal(isConsentExempt({ method: 'DELETE', path: '/api/privacy/delete' }), false);
  });
});
