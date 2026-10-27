const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const express = require('express');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');

process.env.JWT_SECRET = 'doctor-approval-test-secret';

const doctor = {
  id: 7,
  user_id: 21,
  approval_status: 'pending',
  approval_reason: null,
  crm: '123456',
  crm_estado: 'PE',
};
const queryLog = [];
const clientMock = {
  async query(sql, params = []) {
    queryLog.push({ sql, params });
    if (/SELECT approval_status/.test(sql)) {
      return { rows: [{ approval_status: doctor.approval_status }] };
    }
    if (/SELECT \* FROM doctors WHERE user_id/.test(sql)) {
      return { rows: [{ ...doctor }] };
    }
    if (/UPDATE doctors/.test(sql)) {
      doctor.approval_status = params[0] || doctor.approval_status;
      doctor.approval_reason = params[1] || null;
      return { rows: [{ ...doctor }] };
    }
    return { rows: [] };
  },
};

const mocks = {
  '../backend': clientMock,
  '../services/auditService': { audit() {} },
  '../utils/logger': { error() {}, warn() {}, info() {} },
  '../services/cryptoService': {
    encryptRecord: (record) => record,
    decryptRecord: (record) => record,
    getCurrentVersion: () => 1,
  },
  '../services/doctorApprovalService': {
    DOCTOR_APPROVAL_STATUSES: ['pending', 'approved', 'rejected', 'revoked'],
    getDoctorApproval: async () => ({
      approval_status: doctor.approval_status,
      approval_reason: doctor.approval_reason,
    }),
    getDoctorApprovalStatus: async () => doctor.approval_status,
  },
  '../services/emailLookupService': {
    hashDoctorCrm: (crm, state) => `hash:${crm}:${state}`,
    hashEmail: (email) => `email:${email}`,
    normalizeCrm: (crm) => String(crm).trim().toUpperCase().replace(/[^A-Z0-9]/g, ''),
    normalizeCrmState: (state) => String(state).trim().toUpperCase(),
    normalizeEmail: (email) => String(email).trim().toLowerCase(),
  },
  '../services/consentService': {
    ConsentValidationError: class ConsentValidationError extends Error {},
    recordDecision: async () => undefined,
    validateSignupConsents: () => [],
  },
};

const originalLoad = Module._load;
Module._load = function (request) {
  if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
  return originalLoad.apply(this, arguments);
};

const { authenticateToken, requireRole } = require('../middlewares/auth');
const doctorRoutes = require('../routes/doctors');
Module._load = originalLoad;

function tokenFor(user) {
  return `Bearer ${jwt.sign(user, process.env.JWT_SECRET)}`;
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/doctors', doctorRoutes);
  app.get(
    '/clinical',
    rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: false, legacyHeaders: false }),
    authenticateToken,
    requireRole('medico'),
    (_req, res) => res.json({ ok: true })
  );
  return app;
}

test.describe('aprovação de médicos (E7-03)', () => {
  let server;
  let baseUrl;

  test.before(() => {
    server = createApp().listen(0);
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  test.after(() => server.close());

  test.beforeEach(() => {
    doctor.approval_status = 'pending';
    doctor.approval_reason = null;
    queryLog.length = 0;
  });

  async function request(method, path, user, body) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: tokenFor(user),
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json() };
  }

  test('bloqueia médico pendente em rota clínica, mas mantém consulta de aprovação', async () => {
    const clinical = await request('GET', '/clinical', { id: 21, role: 'medico' });
    assert.equal(clinical.status, 403);
    assert.equal(clinical.body.code, 'DOCTOR_APPROVAL_REQUIRED');
    assert.equal(clinical.body.approval_status, 'pending');

    const approval = await request('GET', '/api/doctors/me/approval', { id: 21, role: 'medico' });
    assert.equal(approval.status, 200);
    assert.equal(approval.body.approval_status, 'pending');
  });

  test('libera médico aprovado e mantém admin independente do status', async () => {
    doctor.approval_status = 'approved';
    const clinical = await request('GET', '/clinical', { id: 21, role: 'medico' });
    assert.equal(clinical.status, 200);

    doctor.approval_status = 'pending';
    const admin = await request('GET', '/api/doctors/me/approval', { id: 99, role: 'admin' });
    assert.equal(admin.status, 403);
  });

  test('admin rejeita exigindo motivo e aprova registrando estado', async () => {
    const missingReason = await request(
      'POST',
      '/api/doctors/7/approval',
      { id: 99, role: 'admin' },
      { decision: 'reject' }
    );
    assert.equal(missingReason.status, 400);

    const approved = await request(
      'POST',
      '/api/doctors/7/approval',
      { id: 99, role: 'admin' },
      { decision: 'approve' }
    );
    assert.equal(approved.status, 200);
    assert.equal(approved.body.approval_status, 'approved');
  });
});
