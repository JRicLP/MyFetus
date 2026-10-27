const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Module = require('node:module');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

process.env.JWT_SECRET = 'data-export-test-secret';
process.env.AES_KEY_VERSION = '1';
process.env.AES_ENCRYPTION_KEY_V1 = crypto.randomBytes(32).toString('hex');
// Várias exportações na mesma suíte: o limite (5/15 min) não é o alvo destes testes.
process.env.DATA_EXPORT_RATE_LIMIT_MAX = '1000';

const cryptoService = require('../services/cryptoService');

const PASSWORD = 'senha-sintetica-123';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);
const CIPHERTEXT = /v\d+:[0-9a-f]{24}:[0-9a-f]+:[0-9a-f]{32}/i;

// ------------------------------------------------------------ dados sintéticos
// O banco falso devolve TODAS as colunas da linha, inclusive segredos, para
// provar que a allowlist do serviço filtra mesmo se o SELECT trouxer a mais.
const enc = (record, table) => cryptoService.encryptRecord(record, table);

function seed() {
  return {
    users: [
      { id: 1, ...enc({ name: 'Maria Sintetica', email: 'maria@example.com', birthdate: '1995-04-12' }, 'users'), role: 'gestante', is_active: true, password: PASSWORD_HASH, email_lookup_hash: 'hash-maria', encryption_key_version: 1, created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z' },
      { id: 2, ...enc({ name: 'Joana Sintetica', email: 'joana@example.com', birthdate: '1990-01-30' }, 'users'), role: 'gestante', is_active: true, password: PASSWORD_HASH, email_lookup_hash: 'hash-joana', encryption_key_version: 1, created_at: '2026-09-02T10:00:00Z', updated_at: '2026-09-02T10:00:00Z' },
      { id: 3, ...enc({ name: 'Dra Ana Sintetica', email: 'ana@example.com', birthdate: '1985-08-20' }, 'users'), role: 'medico', is_active: true, password: PASSWORD_HASH, email_lookup_hash: 'hash-ana', encryption_key_version: 1, created_at: '2026-09-03T10:00:00Z', updated_at: '2026-09-03T10:00:00Z' },
      { id: 4, ...enc({ name: 'Conta Inativa', email: 'inativa@example.com', birthdate: '1993-03-03' }, 'users'), role: 'gestante', is_active: false, password: PASSWORD_HASH, email_lookup_hash: 'hash-inativa', created_at: '2026-09-04T10:00:00Z' },
    ],
    consents: [
      { id: 1, user_id: 1, purpose: 'tratamento_dados_saude', version: '1.0', decision: 'accepted', ip_address: '203.0.113.10', user_agent: 'teste', created_at: '2026-09-01T10:00:00Z' },
      { id: 2, user_id: 2, purpose: 'tratamento_dados_saude', version: '1.0', decision: 'accepted', ip_address: '203.0.113.11', user_agent: 'teste', created_at: '2026-09-02T10:00:00Z' },
    ],
    doctors: [
      { id: 7, user_id: 3, ...enc({ crm: '000001', crm_estado: 'PE', telefone: '81900000000' }, 'doctors'), especialidade: 'Obstetricia', encryption_key_version: 1, created_at: '2026-09-03T10:00:00Z', updated_at: '2026-09-03T10:00:00Z' },
    ],
    pregnants: [
      { id: 10, user_id: 1, ...enc({ altura: 1.62, peso_atual: 64.5, antecedentes_texto: 'Sem antecedentes - Maria' }, 'pregnants'), encryption_key_version: 1, created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z' },
      { id: 20, user_id: 2, ...enc({ altura: 1.7, peso_atual: 70, antecedentes_texto: 'Antecedente secreto da Joana' }, 'pregnants'), encryption_key_version: 1, created_at: '2026-09-02T10:00:00Z', updated_at: '2026-09-02T10:00:00Z' },
    ],
    pregnancies: [
      { id: 100, pregnant_id: 10, ...enc({ weeks: 22, dum: '2026-05-20' }, 'pregnancies'), encryption_key_version: 1, created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z' },
      { id: 200, pregnant_id: 20, ...enc({ weeks: 30, dum: '2026-03-15' }, 'pregnancies'), encryption_key_version: 1, created_at: '2026-09-02T10:00:00Z', updated_at: '2026-09-02T10:00:00Z' },
    ],
    pregnancy_events: [
      { id: 1000, pregnancy_id: 100, ...enc({ descricao: 'Consulta de rotina da Maria', data_evento: '2026-09-10' }, 'pregnancy_events'), encryption_key_version: 1, created_at: '2026-09-10T10:00:00Z', updated_at: '2026-09-10T10:00:00Z' },
      { id: 2000, pregnancy_id: 200, ...enc({ descricao: 'Evento da Joana', data_evento: '2026-09-11' }, 'pregnancy_events'), encryption_key_version: 1, created_at: '2026-09-11T10:00:00Z', updated_at: '2026-09-11T10:00:00Z' },
    ],
    fetal_biometry_history: [
      { id: 1, pregnancy_id: 100, measured_at: '2026-09-10', gestational_age_weeks: 22, dbp_mm: 52, cc_mm: 196, ca_mm: 172, cf_mm: 38, estimated_weight_grams: 480, expected_median_weight_grams: 500, percentile: 40, z_score: -0.2, notes: null, created_by_user_id: 3, deleted_at: null, version: 1 },
      { id: 2, pregnancy_id: 100, measured_at: '2026-09-01', gestational_age_weeks: 21, dbp_mm: 50, cc_mm: 190, ca_mm: 165, cf_mm: 36, estimated_weight_grams: 420, expected_median_weight_grams: 430, percentile: 45, z_score: -0.1, notes: 'removida', created_by_user_id: 3, deleted_at: '2026-09-02T00:00:00Z', version: 2 },
    ],
    maternal_weight_history: [
      { id: 1, pregnancy_id: 100, measured_at: '2026-09-10', weight_kg: 64.5, notes: null, created_by_user_id: 3, deleted_at: null },
      { id: 2, pregnancy_id: 200, measured_at: '2026-09-11', weight_kg: 70, notes: 'peso da Joana', created_by_user_id: 3, deleted_at: null },
    ],
    exam_requests: [
      { id: 500, pregnant_id: 10, doctor_id: 3, ...enc({ exam_name: 'Hemograma da Maria', instructions: 'Jejum de 8h' }, 'exam_requests'), status: 'pending', requested_at: '2026-09-12T10:00:00Z', encryption_key_version: 1 },
      { id: 600, pregnant_id: 20, doctor_id: 3, ...enc({ exam_name: 'Exame da Joana', instructions: null }, 'exam_requests'), status: 'pending', requested_at: '2026-09-12T10:00:00Z', encryption_key_version: 1 },
    ],
    pregnant_documents: [
      { id: 900, pregnant_id: 10, exam_request_id: 500, ...enc({ document_name: 'hemograma.pdf', document_type: 'application/pdf', extracted_text: 'Hb 12,5 g/dL', report_comment: 'Normal' }, 'pregnant_documents'), file_path: 'uploads/secret/abc.enc', file_encryption_version: 1, extraction_status: 'done', status: 'reviewed', reviewed_by_user_id: 3, uploaded_at: '2026-09-13T10:00:00Z', encryption_key_version: 1 },
      { id: 901, pregnant_id: 20, exam_request_id: 600, ...enc({ document_name: 'joana.pdf', document_type: 'application/pdf', extracted_text: 'Texto da Joana' }, 'pregnant_documents'), file_path: 'uploads/secret/def.enc', status: 'pending', uploaded_at: '2026-09-13T10:00:00Z' },
    ],
    doctor_patient_links: [
      { id: 1, doctor_id: 3, pregnant_id: 10, status: 'active', created_at: '2026-09-05T10:00:00Z', updated_at: '2026-09-05T10:00:00Z' },
      { id: 2, doctor_id: 3, pregnant_id: 20, status: 'active', created_at: '2026-09-06T10:00:00Z', updated_at: '2026-09-06T10:00:00Z' },
    ],
  };
}

const db = {
  tables: seed(),
  log: [],
  failOn: null,
  reset() {
    this.tables = seed();
    this.log = [];
    this.failOn = null;
  },
  async query(sql, params = []) {
    const text = sql.replace(/\s+/g, ' ').trim();
    this.log.push(text);
    if (this.failOn && text.includes(this.failOn)) throw new Error('falha simulada');
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(text)) return { rows: [] };

    if (text === 'SELECT password, is_active FROM users WHERE id = $1') {
      return { rows: this.tables.users.filter((row) => row.id === params[0]) };
    }

    const match = text.match(/FROM (\w+) \w+ WHERE \w+\.(\w+) = (ANY\(\$1::int\[\]\)|\$1)(.*)$/);
    if (!match) throw new Error(`SQL inesperado no teste: ${text}`);
    const [, table, column, operator, rest] = match;
    const wanted = operator === '$1' ? [params[0]] : params[0];
    const rows = this.tables[table].filter((row) => (
      wanted.includes(row[column]) && (!/deleted_at IS NULL/.test(rest) || row.deleted_at === null)
    ));
    return { rows };
  },
};

const auditEvents = [];
const mocks = {
  '../backend': {
    query: (...args) => db.query(...args),
    connect: async () => ({ query: (...args) => db.query(...args), release() {} }),
  },
  '../services/auditService': {
    audit: (req, event) => auditEvents.push({ actor: req.user?.id, ...event }),
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

test.describe('Exportação dos dados do titular (E7-02.1)', () => {
  let server;
  let baseUrl;

  test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/privacy', privacyRoutes);
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/api/privacy`;
  });

  test.after(() => server.close());
  test.beforeEach(() => {
    db.reset();
    auditEvents.length = 0;
  });

  async function exportAs(auth, body = { password: PASSWORD }) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) headers.Authorization = auth;
    const res = await fetch(`${baseUrl}/export`, { method: 'POST', headers, body: JSON.stringify(body) });
    const raw = await res.text();
    return { status: res.status, headers: res.headers, raw, body: JSON.parse(raw) };
  }

  test('gestante recebe os próprios dados decifrados, como anexo e sem cache', async () => {
    const res = await exportAs(MARIA);

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-disposition'), /attachment; filename="myfetus-meus-dados-\d{4}-\d{2}-\d{2}\.json"/);
    assert.equal(res.headers.get('cache-control'), 'no-store');

    const { body } = res;
    assert.equal(body.formato.versao, '1.0');
    assert.equal(body.titular.name, 'Maria Sintetica');
    assert.equal(body.titular.email, 'maria@example.com');
    assert.equal(body.prontuario.antecedentes_texto, 'Sem antecedentes - Maria');
    assert.equal(body.prontuario.altura, 1.62);
    assert.deepEqual(body.gestacoes.map((row) => row.weeks), [22]);
    assert.deepEqual(body.eventos.map((row) => row.descricao), ['Consulta de rotina da Maria']);
    assert.deepEqual(body.pedidos_de_exame.map((row) => row.exam_name), ['Hemograma da Maria']);
    assert.deepEqual(body.documentos.map((row) => row.extracted_text), ['Hb 12,5 g/dL']);
    assert.deepEqual(body.peso_materno.map((row) => row.weight_kg), [64.5]);
    assert.deepEqual(body.vinculos_medicos.map((row) => row.status), ['active']);
    assert.deepEqual(body.consentimentos.map((row) => row.purpose), ['tratamento_dados_saude']);
  });

  test('não inclui dados de outra gestante (usuário A contra dados de B)', async () => {
    const { raw } = await exportAs(MARIA);

    for (const fromJoana of ['Joana', 'joana@example.com', 'Antecedente secreto', 'Texto da Joana', 'peso da Joana']) {
      assert.equal(raw.includes(fromJoana), false, `vazou dado de B: ${fromJoana}`);
    }
  });

  test('não expõe segredos, ciphertext, caminhos de arquivo nem IDs de terceiros', async () => {
    const { raw, body } = await exportAs(MARIA);

    assert.doesNotMatch(raw, CIPHERTEXT);
    assert.equal(raw.includes(PASSWORD_HASH), false);
    for (const forbidden of ['password', 'email_lookup_hash', 'file_path', 'encryption_key_version',
      'file_encryption_version', 'doctor_id', 'created_by_user_id', 'reviewed_by_user_id', 'ip_address', 'user_agent']) {
      assert.equal(raw.includes(`"${forbidden}"`), false, `campo proibido no export: ${forbidden}`);
    }
    assert.equal(raw.includes('uploads/secret'), false);
    // Medição apagada logicamente não volta na exportação.
    assert.deepEqual(body.biometria_fetal.map((row) => row.id), [1]);
  });

  test('médico exporta o próprio perfil, nunca os dados dos pacientes vinculados', async () => {
    const { status, raw, body } = await exportAs(MEDICA);

    assert.equal(status, 200);
    assert.equal(body.titular.name, 'Dra Ana Sintetica');
    assert.equal(body.perfil_profissional.crm, '000001');
    assert.equal(body.perfil_profissional.telefone, '81900000000');
    assert.equal(body.prontuario, undefined);
    assert.equal(body.gestacoes, undefined);
    assert.equal(body.observacoes.some((note) => /exames/.test(note)), false);
    for (const patientData of ['Maria', 'Joana', 'Hemograma', 'Consulta de rotina']) {
      assert.equal(raw.includes(patientData), false, `vazou dado de paciente: ${patientData}`);
    }
    assert.equal(db.log.some((sql) => /FROM (pregnants|pregnancies|exam_requests|pregnant_documents)/.test(sql)), false);
  });

  test('o titular vem do token: campos de ID no corpo são ignorados', async () => {
    const { body } = await exportAs(MARIA, { password: PASSWORD, user_id: 2, id: 2 });

    assert.equal(body.titular.id, 1);
    assert.equal(body.titular.name, 'Maria Sintetica');
  });

  test('exige a senha: ausente é 400 e incorreta é 403 (não 401, que desloga o app), sem dados e com auditoria', async () => {
    const missing = await exportAs(MARIA, {});
    assert.equal(missing.status, 400);
    assert.equal(missing.body.code, 'PASSWORD_REQUIRED');

    const wrong = await exportAs(MARIA, { password: 'senha-errada' });
    assert.equal(wrong.status, 403);
    assert.equal(wrong.body.code, 'INVALID_PASSWORD');
    assert.equal(wrong.body.titular, undefined);
    assert.equal(db.log.some((sql) => /FROM pregnants/.test(sql)), false);

    assert.deepEqual(auditEvents.map(({ action, outcome, detail }) => [action, outcome, detail.reason]), [
      ['DATA_EXPORT', 'FAILURE', 'invalid_password'],
    ]);
  });

  test('conta inativa ou token sem usuário recebem a mesma resposta segura', async () => {
    const inactive = await exportAs(tokenFor({ id: 4, role: 'gestante' }));
    const ghost = await exportAs(tokenFor({ id: 999, role: 'gestante' }));

    for (const res of [inactive, ghost]) {
      assert.equal(res.status, 403);
      assert.deepEqual(res.body, { error: 'Senha incorreta', code: 'INVALID_PASSWORD' });
    }
  });

  test('sem token não exporta', async () => {
    const res = await exportAs(null);
    assert.equal(res.status, 401);
  });

  test('auditoria do sucesso registra só contagens, sem conteúdo pessoal', async () => {
    await exportAs(MARIA);

    assert.equal(auditEvents.length, 1);
    const [event] = auditEvents;
    assert.equal(event.action, 'DATA_EXPORT');
    assert.equal(event.outcome, 'SUCCESS');
    assert.equal(event.resource_id, 1);
    assert.equal(event.detail.sections.eventos, 1);
    assert.equal(event.detail.sections.observacoes, undefined);
    assert.doesNotMatch(JSON.stringify(event), /Maria|maria@example\.com|Hemograma/);
  });

  test('a leitura acontece num snapshot somente leitura', async () => {
    await exportAs(MARIA);

    const begin = db.log.indexOf('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    assert.ok(begin > 0, 'abre a transação depois de conferir a senha');
    assert.ok(db.log.indexOf('COMMIT') > begin);
  });

  test('falha no banco devolve 500 genérico, sem detalhe interno', async () => {
    db.failOn = 'FROM pregnancy_events';
    const res = await exportAs(MARIA);

    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: 'Erro ao exportar dados' });
    assert.ok(db.log.includes('ROLLBACK'));
    assert.equal(auditEvents.at(-1).detail.reason, 'internal_error');
  });

  test('a exportação fica fora do bloqueio por consentimento', () => {
    assert.equal(isConsentExempt({ method: 'POST', path: '/api/privacy/export' }), true);
    assert.equal(isConsentExempt({ method: 'GET', path: '/api/privacy/export' }), false);
  });
});
