#!/usr/bin/env node

/**
 * Creates the isolated synthetic data used by the Maestro exam-cycle flow.
 *
 * The script talks to the public API instead of inserting encrypted rows
 * directly in PostgreSQL. This keeps the fixture aligned with the same
 * contracts used by the app and avoids putting production-like credentials in
 * the repository.
 */

const apiUrl = (process.env.E2E_API_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const runId = (process.env.E2E_RUN_ID || `local-${Date.now()}`)
  .replace(/[^a-zA-Z0-9]/g, '')
  .slice(-24);
const password = process.env.E2E_PASSWORD || 'E2eExamCycle123!';
const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin_teste@myfetus.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'SenhaTeste123!';
const examName = 'Hemograma sintetico E2E';
const reportText = 'Resultado sintetico revisado: hemoglobina 12.5 g/dL.';

const doctorEmail = `e2e.doctor.${runId}@example.test`.toLowerCase();
const patientEmail = `e2e.patient.${runId}@example.test`.toLowerCase();

const doctorConsents = [
  { purpose: 'termos_de_uso_medico', version: '0.1-rascunho' },
  { purpose: 'politica_de_privacidade', version: '0.1-rascunho' },
].map((item) => ({ ...item, decision: 'accepted' }));

const patientConsents = [
  { purpose: 'termos_de_uso_gestante', version: '0.1-rascunho' },
  { purpose: 'politica_de_privacidade', version: '0.1-rascunho' },
  { purpose: 'tratamento_dados_saude', version: '0.1-rascunho' },
].map((item) => ({ ...item, decision: 'accepted' }));

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} retornou ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function login(email, loginPassword = password) {
  return request('/api/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: loginPassword }),
  });
}

async function main() {
  await request('/ping');

  const doctorRegistration = await request('/api/doctors', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Médico E2E Sintético',
      email: doctorEmail,
      password,
      birthdate: '1980-01-01',
      crm: `E2E${runId.slice(-6)}`,
      crm_estado: 'PE',
      especialidade: 'Obstetrícia',
      telefone: '81999999999',
      consents: doctorConsents,
    }),
  });

  // A fixture sintética segue o mesmo fluxo do produto: um admin aprovado
  // explicitamente libera o médico antes do acesso às rotas clínicas.
  const adminSession = await login(adminEmail, adminPassword);
  await request(`/api/doctors/${doctorRegistration.doctor.id}/approval`, {
    method: 'POST',
    headers: { authorization: `Bearer ${adminSession.token}` },
    body: JSON.stringify({ decision: 'approve' }),
  });

  await request('/api/users', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Gestante E2E Sintética',
      email: patientEmail,
      password,
      birthdate: '1990-01-01',
      consents: patientConsents,
    }),
  });

  const doctorSession = await login(doctorEmail);
  const patientSession = await login(patientEmail);
  const pregnantId = Number(patientSession.user?.pregnant_id);
  if (!Number.isInteger(pregnantId) || pregnantId < 1) {
    throw new Error('Login sintético não retornou pregnant_id');
  }

  await request('/api/pregnancies', {
    method: 'POST',
    headers: { authorization: `Bearer ${patientSession.token}` },
    body: JSON.stringify({
      pregnant_id: pregnantId,
      weeks: 12,
      is_checked: false,
      dum: '2026-08-01',
      dpp: '2027-05-08',
      ccn: 0,
      dgm: 0,
      glicemia: 0,
      frequencia_cardiaca: 0,
      altura_uterina: 0,
      regularidade_do_ciclo: true,
      ig_ultrassonografia: 12,
    }),
  });

  await request('/api/doctor-patient-links', {
    method: 'POST',
    headers: { authorization: `Bearer ${doctorSession.token}` },
    body: JSON.stringify({ pregnant_id: pregnantId }),
  });

  process.stdout.write([
    `E2E_API_URL=${apiUrl}`,
    `E2E_DOCTOR_EMAIL=${doctorEmail}`,
    `E2E_PATIENT_EMAIL=${patientEmail}`,
    `E2E_PASSWORD=${password}`,
    `E2E_PREGNANT_ID=${pregnantId}`,
    `E2E_EXAM_NAME=${examName}`,
    `E2E_REPORT_TEXT=${reportText}`,
  ].join('\n') + '\n');
}

main().catch((error) => {
  console.error(`Falha ao preparar fixture E2E: ${error.message}`);
  process.exitCode = 1;
});
