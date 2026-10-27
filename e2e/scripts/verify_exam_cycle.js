#!/usr/bin/env node

/** Verifies the final state of the synthetic exam cycle through the API. */

const apiUrl = (process.env.E2E_API_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const email = process.env.E2E_PATIENT_EMAIL;
const password = process.env.E2E_PASSWORD;
const pregnantId = process.env.E2E_PREGNANT_ID;
const examName = process.env.E2E_EXAM_NAME;
const reportText = process.env.E2E_REPORT_TEXT;
const timeoutMs = Number(process.env.E2E_VERIFY_TIMEOUT_MS || 90000);

if (!email || !password || !pregnantId || !examName || !reportText) {
  throw new Error('Variáveis da fixture E2E incompletas');
}

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, options);
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const session = await request('/api/users/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const token = session.token;
  const headers = { authorization: `Bearer ${token}` };
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const [requests, documents] = await Promise.all([
      request(`/api/exam-requests/pregnant/${pregnantId}`, { headers }),
      request(`/api/documents/?pregnant_id=${pregnantId}`, { headers }),
    ]);
    const examRequest = requests.find((item) => item.exam_name === examName);
    const document = examRequest
      ? documents.find((item) => item.exam_request_id === examRequest.id)
      : undefined;

    if (
      examRequest?.status === 'reviewed' &&
      document?.status === 'reviewed' &&
      document?.extraction_status === 'done' &&
      document?.report_comment === reportText
    ) {
      if (Object.prototype.hasOwnProperty.call(document, 'file_path')) {
        throw new Error('Resposta de documentos vazou file_path');
      }
      console.log(JSON.stringify({
        status: 'passed',
        examRequestStatus: examRequest.status,
        documentStatus: document.status,
        extractionStatus: document.extraction_status,
      }));
      return;
    }
    await sleep(1000);
  }

  throw new Error('O ciclo não atingiu reviewed + extraction_status=done dentro do prazo');
}

main().catch((error) => {
  console.error('Falha na verificação E2E');
  process.exitCode = 1;
});
