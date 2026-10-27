const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const {
  scanOrphanUploads,
  executeCleanupFromManifest,
} = require('../scripts/cleanup-orphan-uploads');

test('Scanner de Órfãos, Quarentena e Inconsistências de Upload', async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orphan-test-'));
  const uploadsDir = path.join(tempDir, 'uploads');
  const encryptedDir = path.join(uploadsDir, 'encrypted');
  const quarantineDir = path.join(uploadsDir, '.quarantine');

  await fs.mkdir(encryptedDir, { recursive: true });

  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // Criação dos arquivos de teste:
  // 1. Arquivo referenciado no banco (válido)
  const validFilePath = path.join(encryptedDir, 'valid-doc-1.mfe');
  await fs.writeFile(validFilePath, 'encrypted-content-1');

  // 2. Arquivo órfão antigo (> 24h) em uploads/
  const oldTempOrphan = path.join(uploadsDir, 'old-temp-upload.tmp');
  await fs.writeFile(oldTempOrphan, 'temporary-interrupted-upload');
  const pastTime = new Date(Date.now() - 30 * 60 * 60 * 1000); // 30 horas atrás
  await fs.utimes(oldTempOrphan, pastTime, pastTime);

  // 3. Arquivo recente (< 24h) em uploads/ (em trânsito)
  const recentUpload = path.join(uploadsDir, 'recent-upload.tmp');
  await fs.writeFile(recentUpload, 'upload-in-progress'); // mtime atual

  // 4. Arquivo cifrado órfão antigo (> 24h) em uploads/encrypted/ (.mfe válido)
  const oldEncryptedOrphan = path.join(encryptedDir, 'orphan-doc-2.mfe');
  await fs.writeFile(oldEncryptedOrphan, 'abandoned-encrypted-file');
  await fs.utimes(oldEncryptedOrphan, pastTime, pastTime);

  // 5. Arquivo avulso antigo (> 24h) em uploads/encrypted/ que NÃO é .mfe (deve ser ignorado)
  const nonMfeInEncrypted = path.join(encryptedDir, 'stray-file.txt');
  await fs.writeFile(nonMfeInEncrypted, 'not-an-mfe-file');
  await fs.utimes(nonMfeInEncrypted, pastTime, pastTime);

  // Mock do pool de banco de dados
  const dbUpdates = [];
  const auditLogs = [];
  const mockDbClient = {
    query: async (sql, params) => {
      if (sql.includes('SELECT') && sql.includes('pregnant_documents')) {
        return {
          rows: [
            { id: 1, pregnant_id: 10, file_path: validFilePath, extraction_status: 'done' },
            { id: 2, pregnant_id: 11, file_path: path.join(encryptedDir, 'missing-on-disk.mfe'), extraction_status: 'pending' },
          ],
        };
      }
      if (sql.includes('UPDATE pregnant_documents')) {
        dbUpdates.push({ sql, params });
        return { rowCount: 1 };
      }
      if (sql.includes('INSERT INTO audit_logs')) {
        auditLogs.push({ sql, params });
        return { rowCount: 1 };
      }
      return { rows: [] };
    },
    release: () => {},
  };

  const mockPool = {
    connect: async () => mockDbClient,
    query: mockDbClient.query,
  };

  await t.test('scanOrphanUploads deve respeitar o grace period de 24h e identificar órfãos e arquivos ausentes', async () => {
    const report = await scanOrphanUploads(mockPool, {
      uploadsDir,
      graceHours: 24,
    });

    assert.equal(report.summary.orphanCount, 2); // oldTempOrphan + oldEncryptedOrphan
    assert.equal(report.summary.recentPreservedCount, 1); // recentUpload foi preservado
    assert.equal(report.summary.missingCount, 1); // missing-on-disk.mfe

    const orphanPaths = report.orphanFiles.map((f) => path.resolve(f.path));
    assert.ok(orphanPaths.includes(path.resolve(oldTempOrphan)));
    assert.ok(orphanPaths.includes(path.resolve(oldEncryptedOrphan)));
    assert.ok(!orphanPaths.includes(path.resolve(recentUpload)), 'Arquivo recente com < 24h não deve ser listado como órfão');
    assert.ok(!orphanPaths.includes(path.resolve(nonMfeInEncrypted)), 'Arquivo em uploads/encrypted/ sem extensão .mfe não deve ser listado como órfão cifrado');

    // Valida detecção de inconsistência reversa
    assert.equal(report.missingFiles[0].id, 2);
    assert.equal(report.missingFiles[0].pregnantId, 11);
  });

  await t.test('executeCleanupFromManifest deve mover órfãos para quarentena e sinalizar erro no banco sem deletar', async () => {
    const report = await scanOrphanUploads(mockPool, {
      uploadsDir,
      graceHours: 24,
    });

    const manifestPath = path.join(tempDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(report, null, 2));

    const result = await executeCleanupFromManifest(mockPool, {
      manifestPath,
      uploadsDir,
      quarantineDir,
    });

    assert.equal(result.quarantinedCount, 2);
    assert.equal(result.flaggedMissingCount, 1);

    // Valida que os arquivos originais foram movidos para a quarentena
    const tempExists = await fs.access(oldTempOrphan).then(() => true).catch(() => false);
    const encExists = await fs.access(oldEncryptedOrphan).then(() => true).catch(() => false);
    assert.equal(tempExists, false, 'Arquivo temporário órfão deveria ter sido movido');
    assert.equal(encExists, false, 'Arquivo cifrado órfão deveria ter sido movido');

    // Valida que o arquivo recente continua intacto em uploads/
    const recentExists = await fs.access(recentUpload).then(() => true).catch(() => false);
    assert.equal(recentExists, true, 'Arquivo recente deve continuar no diretório original');

    // Valida que o arquivo válido continua intacto
    const validExists = await fs.access(validFilePath).then(() => true).catch(() => false);
    assert.equal(validExists, true, 'Arquivo com registro válido deve continuar intacto');

    // Valida sinalização de erro no banco sem exclusão
    assert.equal(dbUpdates.length, 1);
    assert.ok(dbUpdates[0].sql.includes("extraction_status = 'failed'"));
    assert.ok(dbUpdates[0].sql.includes('INTEGRITY_ERROR_FILE_MISSING'));
    assert.equal(dbUpdates[0].params[0], 2); // ID do documento ausente
  });
});
