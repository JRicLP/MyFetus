const fs = require('fs/promises');
const path = require('path');
const {
  ENCRYPTED_FIELDS,
} = require('../config/dataClassification');
const cryptoService = require('./cryptoService');
const fileCryptoService = require('./fileCryptoService');
const { hashEmail } = require('./emailLookupService');

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]*$/;

function quoteIdentifier(identifier) {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new Error(`Identificador invalido: ${identifier}`);
  }
  return `"${identifier}"`;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function isEncryptedFile(filePath) {
  const handle = await fs.open(filePath, 'r');
  try {
    const header = Buffer.alloc(64);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    return fileCryptoService.isEncryptedBuffer(header.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}

function recordNeedsEncryption(record, table) {
  return ENCRYPTED_FIELDS[table].some((field) => (
    record[field] !== null &&
    record[field] !== undefined &&
    !cryptoService.isEncrypted(record[field])
  ));
}

async function tableExists(dbClient, table) {
  const result = await dbClient.query(
    'SELECT to_regclass($1) AS relation',
    [`public.${table}`]
  );
  return Boolean(result.rows[0].relation);
}

async function prepareDocumentFile(record, dryRun) {
  if (!record.file_path || !(await pathExists(record.file_path))) {
    return {
      changed: false,
      cleanupAfterCommit: null,
      createdPath: null,
      filePath: record.file_path,
    };
  }

  if (await isEncryptedFile(record.file_path)) {
    const possibleLegacyPath = record.file_path.endsWith('.mfe')
      ? record.file_path.slice(0, -4)
      : null;
    return {
      changed: false,
      cleanupAfterCommit: possibleLegacyPath,
      createdPath: null,
      filePath: record.file_path,
    };
  }

  const targetPath = `${record.file_path}.mfe`;
  const targetExists = await pathExists(targetPath);
  if (!dryRun && !targetExists) {
    await fileCryptoService.encryptFile(
      record.file_path,
      targetPath,
      { pregnantId: record.pregnant_id }
    );
  }
  if (!dryRun && targetExists && !(await isEncryptedFile(targetPath))) {
    throw new Error(`Destino de migracao invalido: ${targetPath}`);
  }

  return {
    changed: true,
    cleanupAfterCommit: record.file_path,
    createdPath: targetExists || dryRun ? null : targetPath,
    filePath: targetPath,
  };
}

function buildUpdate(record, table, fileMigration) {
  const update = cryptoService.encryptRecord(record, table);
  const changedFields = {};

  for (const field of ENCRYPTED_FIELDS[table]) {
    if (
      Object.prototype.hasOwnProperty.call(record, field) &&
      update[field] !== record[field]
    ) {
      changedFields[field] = update[field];
    }
  }
  if (fileMigration?.changed) {
    changedFields.file_path = fileMigration.filePath;
  }
  if (
    table === 'pregnant_documents' &&
    fileMigration &&
    record.file_encryption_version !== cryptoService.getCurrentVersion()
  ) {
    changedFields.file_encryption_version = cryptoService.getCurrentVersion();
  }
  if (
    Object.keys(changedFields).length > 0 ||
    record.encryption_key_version !== cryptoService.getCurrentVersion()
  ) {
    changedFields.encryption_key_version = cryptoService.getCurrentVersion();
  }
  if (table === 'users' && record.email) {
    const decrypted = cryptoService.decryptRecord(record, 'users');
    const lookupHash = hashEmail(decrypted.email);
    if (lookupHash !== record.email_lookup_hash) {
      changedFields.email_lookup_hash = lookupHash;
    }
  }
  return changedFields;
}

async function updateRecord(dbClient, table, id, update) {
  const entries = Object.entries(update);
  if (entries.length === 0) return false;
  const setClause = entries
    .map(([field], index) => `${quoteIdentifier(field)} = $${index + 1}`)
    .join(', ');
  await dbClient.query(
    `UPDATE ${quoteIdentifier(table)}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${entries.length + 1}`,
    [...entries.map(([, value]) => value), id]
  );
  return true;
}

async function migrateRecord(pool, table, record, options = {}) {
  const dryRun = options.dryRun === true;
  const dbClient = await pool.connect();
  let fileMigration;
  let committed = false;

  try {
    await dbClient.query('BEGIN');
    fileMigration = table === 'pregnant_documents'
      ? await prepareDocumentFile(record, dryRun)
      : null;
    const update = buildUpdate(record, table, fileMigration);
    const changed = Object.keys(update).length > 0;
    if (!dryRun && changed) {
      await updateRecord(dbClient, table, record.id, update);
    }
    if (dryRun) await dbClient.query('ROLLBACK');
    else {
      await dbClient.query('COMMIT');
      committed = true;
    }

    if (!dryRun && fileMigration?.cleanupAfterCommit) {
      try {
        await fs.rm(fileMigration.cleanupAfterCommit, { force: true });
      } catch (error) {
        return {
          changed,
          cleanupError: error.message,
          id: record.id,
        };
      }
    }
    return { changed, id: record.id };
  } catch (error) {
    if (!committed) {
      try {
        await dbClient.query('ROLLBACK');
      } catch (_) {
        // Preserve the original migration error.
      }
    }
    if (!committed && fileMigration?.createdPath) {
      await fs.rm(fileMigration.createdPath, { force: true });
    }
    throw error;
  } finally {
    dbClient.release();
  }
}

async function migrateExistingData(pool, options = {}) {
  const limit = Number(options.limit || 0);
  const summary = {
    errors: [],
    migrated: 0,
    orphanFilesMigrated: 0,
    orphanFilesScanned: 0,
    scanned: 0,
    unchanged: 0,
  };

  for (const table of Object.keys(ENCRYPTED_FIELDS)) {
    const dbClient = await pool.connect();
    let rows;
    try {
      if (!(await tableExists(dbClient, table))) continue;
      const limitClause = limit > 0 ? ' LIMIT $1' : '';
      const result = await dbClient.query(
        `SELECT * FROM ${quoteIdentifier(table)} ORDER BY id${limitClause}`,
        limit > 0 ? [limit] : []
      );
      rows = result.rows;
    } finally {
      dbClient.release();
    }

    for (const record of rows) {
      summary.scanned += 1;
      try {
        const result = await migrateRecord(pool, table, record, options);
        if (result.changed) summary.migrated += 1;
        else summary.unchanged += 1;
      } catch (error) {
        summary.errors.push({
          id: record.id,
          message: error.message,
          table,
        });
        if (options.stopOnError) throw error;
      }
    }
  }

  const orphanSummary = await migrateOrphanFiles(pool, options);
  summary.orphanFilesMigrated = orphanSummary.migrated;
  summary.orphanFilesScanned = orphanSummary.scanned;
  summary.errors.push(...orphanSummary.errors);
  return summary;
}

async function migrateOrphanFiles(pool, options = {}) {
  const uploadsDirectory = path.resolve(options.uploadsDirectory || 'uploads');
  const quarantineDirectory = path.join(uploadsDirectory, 'quarantine');
  const minimumAgeMs = Number(
    options.orphanMinimumAgeMs ??
    process.env.ORPHAN_FILE_MINIMUM_AGE_MS ??
    60 * 60 * 1000
  );
  const summary = { errors: [], migrated: 0, scanned: 0 };
  let entries;
  try {
    entries = await fs.readdir(uploadsDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return summary;
    throw error;
  }

  const result = await pool.query(
    `SELECT file_path FROM pregnant_documents WHERE file_path IS NOT NULL`
  );
  const referencedPaths = new Set(
    result.rows.map((row) => path.resolve(row.file_path))
  );

  for (const entry of entries) {
    if (!entry.isFile() || entry.name.endsWith('.mfe')) continue;
    const sourcePath = path.join(uploadsDirectory, entry.name);
    if (referencedPaths.has(path.resolve(sourcePath))) continue;

    const stat = await fs.stat(sourcePath);
    if (Date.now() - stat.mtimeMs < minimumAgeMs) continue;
    summary.scanned += 1;
    const targetPath = path.join(quarantineDirectory, `${entry.name}.mfe`);

    try {
      if (options.dryRun) {
        summary.migrated += 1;
        continue;
      }
      if (!(await pathExists(targetPath))) {
        await fileCryptoService.encryptFile(
          sourcePath,
          targetPath,
          { pregnantId: 'orphan' }
        );
      } else if (!(await isEncryptedFile(targetPath))) {
        throw new Error(`Arquivo de quarentena invalido: ${targetPath}`);
      }
      await fs.rm(sourcePath, { force: true });
      summary.migrated += 1;
    } catch (error) {
      summary.errors.push({
        file: sourcePath,
        message: error.message,
        table: 'orphan_files',
      });
      if (options.stopOnError) throw error;
    }
  }
  return summary;
}

module.exports = {
  buildUpdate,
  isEncryptedFile,
  migrateExistingData,
  migrateOrphanFiles,
  migrateRecord,
  pathExists,
  prepareDocumentFile,
  recordNeedsEncryption,
};
