const assert = require('assert');
const bcrypt = require('bcrypt');
const fs = require('fs/promises');
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../../.env'),
  override: true,
});
process.env.PG_HOST = '127.0.0.1';
process.env.PG_PORT = '5434';

const client = require('../backend');
const fileCryptoService = require('../services/fileCryptoService');
const {
  migrateRecord,
} = require('../services/dataEncryptionMigrationService');

async function run() {
  const suffix = Date.now();
  const legacyEmail = `legacy-${suffix}@example.test`;
  const sourcePath = path.resolve('uploads', `legacy-${suffix}.txt`);
  const rollbackPath = path.resolve('uploads', `legacy-rollback-${suffix}.txt`);
  let userId;
  let pregnantId;
  let documentId;
  let rollbackDocumentId;
  let triggerCreated = false;

  try {
    const password = await bcrypt.hash('StrongPass123!', 10);
    const user = await client.query(
      `INSERT INTO users (
         name, email, password, birthdate, is_active, role
       ) VALUES ($1, $2, $3, $4, true, 'gestante')
       RETURNING *`,
      ['Usuario Legado', legacyEmail, password, '1990-01-10']
    );
    userId = user.rows[0].id;
    const pregnant = await client.query(
      'INSERT INTO pregnants (user_id) VALUES ($1) RETURNING id',
      [userId]
    );
    pregnantId = pregnant.rows[0].id;

    const userMigration = await migrateRecord(
      client,
      'users',
      user.rows[0]
    );
    assert.strictEqual(userMigration.changed, true);
    const migratedUser = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    assert.match(migratedUser.rows[0].name, /^v1:/);
    assert.match(migratedUser.rows[0].email_lookup_hash, /^[0-9a-f]{64}$/);

    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    await fs.writeFile(sourcePath, 'arquivo legado');
    const document = await client.query(
      `INSERT INTO pregnant_documents (
         pregnant_id, document_name, document_type, file_path
       ) VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [pregnantId, 'legado.txt', 'text/plain', sourcePath]
    );
    documentId = document.rows[0].id;

    const first = await migrateRecord(
      client,
      'pregnant_documents',
      document.rows[0]
    );
    assert.strictEqual(first.changed, true);
    const migratedDocument = await client.query(
      'SELECT * FROM pregnant_documents WHERE id = $1',
      [documentId]
    );
    const encryptedPath = migratedDocument.rows[0].file_path;
    assert.strictEqual(encryptedPath, `${sourcePath}.mfe`);
    assert.match(migratedDocument.rows[0].document_name, /^v1:/);
    assert.ok(fileCryptoService.isEncryptedBuffer(
      await fs.readFile(encryptedPath)
    ));
    await assert.rejects(fs.access(sourcePath));

    const second = await migrateRecord(
      client,
      'pregnant_documents',
      migratedDocument.rows[0]
    );
    assert.strictEqual(second.changed, false);

    await fs.writeFile(rollbackPath, 'arquivo para rollback');
    const rollbackDocument = await client.query(
      `INSERT INTO pregnant_documents (
         pregnant_id, document_name, document_type, file_path
       ) VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [pregnantId, 'rollback.txt', 'text/plain', rollbackPath]
    );
    rollbackDocumentId = rollbackDocument.rows[0].id;

    await client.query(`
      CREATE OR REPLACE FUNCTION reject_document_update_for_test()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.id = ${Number(rollbackDocumentId)} THEN
          RAISE EXCEPTION 'update rejected for migration rollback test';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_document_update_for_test
      BEFORE UPDATE ON pregnant_documents
      FOR EACH ROW EXECUTE FUNCTION reject_document_update_for_test();
    `);
    triggerCreated = true;
    await assert.rejects(
      migrateRecord(
        client,
        'pregnant_documents',
        rollbackDocument.rows[0]
      ),
      /update rejected/
    );
    await fs.access(rollbackPath);
    await assert.rejects(fs.access(`${rollbackPath}.mfe`));
    const afterRollback = await client.query(
      'SELECT document_name, file_path FROM pregnant_documents WHERE id = $1',
      [rollbackDocumentId]
    );
    assert.strictEqual(afterRollback.rows[0].document_name, 'rollback.txt');
    assert.strictEqual(afterRollback.rows[0].file_path, rollbackPath);

    console.log('data encryption migration integration: OK');
  } finally {
    if (triggerCreated) {
      await client.query(
        'DROP TRIGGER IF EXISTS reject_document_update_for_test ON pregnant_documents'
      );
      await client.query(
        'DROP FUNCTION IF EXISTS reject_document_update_for_test()'
      );
    }
    if (rollbackDocumentId) {
      await client.query(
        'DELETE FROM pregnant_documents WHERE id = $1',
        [rollbackDocumentId]
      );
    }
    if (documentId) {
      await client.query(
        'DELETE FROM pregnant_documents WHERE id = $1',
        [documentId]
      );
    }
    if (userId) await client.query('DELETE FROM users WHERE id = $1', [userId]);
    await Promise.all([
      fs.rm(sourcePath, { force: true }),
      fs.rm(`${sourcePath}.mfe`, { force: true }),
      fs.rm(rollbackPath, { force: true }),
      fs.rm(`${rollbackPath}.mfe`, { force: true }),
    ]);
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
