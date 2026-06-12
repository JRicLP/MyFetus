const assert = require('assert');
const fs = require('fs/promises');
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../../.env'),
  override: true,
});
process.env.PG_HOST = '127.0.0.1';
process.env.PG_PORT = '5434';
process.env.DISABLE_DOCUMENT_EXTRACTION_QUEUE = 'true';

const client = require('../backend');
const fileCryptoService = require('../services/fileCryptoService');
const { createUser } = require('../controllers/userController');
const {
  deleteDocument,
  downloadDocument,
  getDocumentById,
  getDocumentExtractedText,
  uploadDocument,
} = require('../controllers/documentsController');
const {
  processDocumentTextExtraction,
} = require('../services/documentExtractionWorker');

function createResponse() {
  return {
    body: undefined,
    headers: {},
    statusCode: 200,
    attachment(name) {
      this.headers.attachment = name;
      return this;
    },
    type(value) {
      this.headers.type = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

async function createTestUser(email) {
  const response = createResponse();
  await createUser({
    body: {
      name: 'Documento Teste',
      email,
      password: 'StrongPass123!',
      birthdate: '1991-04-15',
    },
  }, response);
  assert.strictEqual(response.statusCode, 201);
  const pregnant = await client.query(
    'SELECT id FROM pregnants WHERE user_id = $1',
    [response.body.id]
  );
  return { pregnantId: pregnant.rows[0].id, userId: response.body.id };
}

async function run() {
  const suffix = Date.now();
  const patient = await createTestUser(`doc-patient-${suffix}@example.test`);
  const doctor = await createTestUser(`doc-doctor-${suffix}@example.test`);
  const admin = { id: 999999, role: 'admin' };
  const temporaryFiles = [];
  let documentId;
  let storedPath;
  let deleteTriggerCreated = false;

  try {
    await client.query('UPDATE users SET role = $1 WHERE id = $2', [
      'medico',
      doctor.userId,
    ]);

    const uploadPath = path.resolve('uploads', `test-${suffix}.txt`);
    temporaryFiles.push(uploadPath);
    const plaintext = Buffer.from('resultado de exame confidencial', 'utf8');
    await fs.mkdir(path.dirname(uploadPath), { recursive: true });
    await fs.writeFile(uploadPath, plaintext);

    const uploadResponse = createResponse();
    await uploadDocument({
      body: {
        pregnant_id: patient.pregnantId,
        document_name: 'resultado.txt',
        document_type: 'text/plain',
      },
      file: {
        mimetype: 'text/plain',
        path: uploadPath,
      },
      user: admin,
    }, uploadResponse);
    assert.strictEqual(uploadResponse.statusCode, 201);
    assert.ok(!('file_path' in uploadResponse.body.document));
    documentId = uploadResponse.body.document.id;

    const stored = await client.query(
      'SELECT * FROM pregnant_documents WHERE id = $1',
      [documentId]
    );
    storedPath = stored.rows[0].file_path;
    assert.match(stored.rows[0].document_name, /^v1:/);
    assert.ok(fileCryptoService.isEncryptedBuffer(await fs.readFile(storedPath)));
    await assert.rejects(fs.access(uploadPath));

    const denied = createResponse();
    await getDocumentById({
      params: { id: documentId },
      user: { id: doctor.userId, role: 'medico' },
    }, denied);
    assert.strictEqual(denied.statusCode, 403);

    const patientDenied = createResponse();
    await getDocumentById({
      params: { id: documentId },
      user: { id: patient.userId, role: 'gestante' },
    }, patientDenied);
    assert.strictEqual(patientDenied.statusCode, 403);

    await client.query(
      `INSERT INTO doctor_patient_links (doctor_id, pregnant_id, status)
       VALUES ($1, $2, 'active')`,
      [doctor.userId, patient.pregnantId]
    );
    const allowed = createResponse();
    await getDocumentById({
      params: { id: documentId },
      user: { id: doctor.userId, role: 'medico' },
    }, allowed);
    assert.strictEqual(allowed.statusCode, 200);
    assert.strictEqual(allowed.body.document_name, 'resultado.txt');
    assert.ok(!('file_path' in allowed.body));

    const download = createResponse();
    await downloadDocument({
      params: { id: documentId },
      user: admin,
    }, download);
    assert.deepStrictEqual(download.body, plaintext);
    assert.strictEqual(download.headers.attachment, 'resultado.txt');

    await processDocumentTextExtraction(documentId);
    const extracted = await client.query(
      'SELECT extracted_text FROM pregnant_documents WHERE id = $1',
      [documentId]
    );
    assert.match(extracted.rows[0].extracted_text, /^v1:/);
    const textResponse = createResponse();
    await getDocumentExtractedText({
      params: { id: documentId },
      user: admin,
    }, textResponse);
    assert.strictEqual(textResponse.statusCode, 200);
    assert.strictEqual(textResponse.body.extracted_text, plaintext.toString());

    const originalCiphertext = await fs.readFile(storedPath);
    const tampered = Buffer.from(originalCiphertext);
    tampered[tampered.length - 17] ^= 0xff;
    await fs.writeFile(storedPath, tampered);
    const tamperedDownload = createResponse();
    await downloadDocument({
      params: { id: documentId },
      user: admin,
    }, tamperedDownload);
    assert.strictEqual(tamperedDownload.statusCode, 500);
    await fs.writeFile(storedPath, originalCiphertext);

    const beforeRollback = new Set(
      await fs.readdir(path.resolve('uploads/encrypted'))
    );
    const rejectedPath = path.resolve('uploads', `rollback-${suffix}.txt`);
    temporaryFiles.push(rejectedPath);
    await fs.writeFile(rejectedPath, 'nao deve persistir');
    const rejectedUpload = createResponse();
    await uploadDocument({
      body: {
        pregnant_id: 2147483647,
        document_name: 'rollback.txt',
        document_type: 'text/plain',
      },
      file: { mimetype: 'text/plain', path: rejectedPath },
      user: admin,
    }, rejectedUpload);
    assert.strictEqual(rejectedUpload.statusCode, 500);
    const afterRollback = new Set(
      await fs.readdir(path.resolve('uploads/encrypted'))
    );
    assert.deepStrictEqual(afterRollback, beforeRollback);
    await assert.rejects(fs.access(rejectedPath));

    await client.query(`
      CREATE OR REPLACE FUNCTION reject_document_delete_for_test()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'delete rejected for rollback test';
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_document_delete_for_test
      BEFORE DELETE ON pregnant_documents
      FOR EACH ROW EXECUTE FUNCTION reject_document_delete_for_test();
    `);
    deleteTriggerCreated = true;
    const rejectedDelete = createResponse();
    await deleteDocument({
      params: { id: documentId },
      user: admin,
    }, rejectedDelete);
    assert.strictEqual(rejectedDelete.statusCode, 500);
    await fs.access(storedPath);
    assert.strictEqual(
      Number((await client.query(
        'SELECT COUNT(*) FROM pregnant_documents WHERE id = $1',
        [documentId]
      )).rows[0].count),
      1
    );
    await client.query(
      'DROP TRIGGER reject_document_delete_for_test ON pregnant_documents'
    );
    await client.query('DROP FUNCTION reject_document_delete_for_test()');
    deleteTriggerCreated = false;

    const deleted = createResponse();
    await deleteDocument({
      params: { id: documentId },
      user: admin,
    }, deleted);
    assert.strictEqual(deleted.statusCode, 200);
    documentId = null;
    await assert.rejects(fs.access(storedPath));

    console.log('document security integration: OK');
  } finally {
    if (deleteTriggerCreated) {
      await client.query(
        'DROP TRIGGER IF EXISTS reject_document_delete_for_test ON pregnant_documents'
      );
      await client.query(
        'DROP FUNCTION IF EXISTS reject_document_delete_for_test()'
      );
    }
    if (documentId) {
      await client.query(
        'DELETE FROM pregnant_documents WHERE id = $1',
        [documentId]
      );
    }
    if (storedPath) await fs.rm(storedPath, { force: true });
    for (const filePath of temporaryFiles) {
      await fs.rm(filePath, { force: true });
    }
    await client.query(
      'DELETE FROM users WHERE id = ANY($1::int[])',
      [[patient.userId, doctor.userId]]
    );
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
