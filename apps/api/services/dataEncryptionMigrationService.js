const crypto = require('crypto');
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

  const currentVersion = cryptoService.getCurrentVersion();

  if (await isEncryptedFile(record.file_path)) {
    const fileVersion = record.file_encryption_version;
    if (fileVersion !== undefined && fileVersion !== null && fileVersion < currentVersion) {
      const targetPath = record.file_path;
      const temporaryPath = `${targetPath}.${crypto.randomUUID()}.tmp`;
      if (!dryRun) {
        const decrypted = await fileCryptoService.readDecryptedFile(
          targetPath,
          { pregnantId: record.pregnant_id }
        );
        const encrypted = fileCryptoService.encryptBuffer(decrypted, {
          pregnantId: record.pregnant_id,
        });
        await fs.writeFile(temporaryPath, encrypted, { flag: 'wx', mode: 0o600 });
      }
      return {
        changed: true,
        cleanupAfterCommit: null,
        createdPath: dryRun ? null : temporaryPath,
        filePath: targetPath,
        targetCommitPath: targetPath,
      };
    }

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
  const currentVersion = cryptoService.getCurrentVersion();
  let sourceRecord = record;

  if (record.encryption_key_version !== null &&
      record.encryption_key_version !== undefined &&
      record.encryption_key_version < currentVersion) {
    sourceRecord = cryptoService.decryptRecord(record, table);
  }

  const update = cryptoService.encryptRecord(sourceRecord, table);
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
    record.file_encryption_version !== currentVersion
  ) {
    changedFields.file_encryption_version = currentVersion;
  }
  if (
    Object.keys(changedFields).length > 0 ||
    record.encryption_key_version !== currentVersion
  ) {
    changedFields.encryption_key_version = currentVersion;
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

async function migrateBatch(pool, table, records, options = {}) {
  const dryRun = options.dryRun === true;
  const isDedicatedClient = typeof pool.connect !== 'function';
  const dbClient = isDedicatedClient ? pool : await pool.connect();
  const fileMigrations = [];
  let committed = false;

  try {
    await dbClient.query('BEGIN');
    const updates = [];

    for (const record of records) {
      const fileMigration = table === 'pregnant_documents'
        ? await prepareDocumentFile(record, dryRun)
        : null;
      if (fileMigration) fileMigrations.push(fileMigration);

      const update = buildUpdate(record, table, fileMigration);
      const changed = Object.keys(update).length > 0;
      if (changed) {
        updates.push({ record, update, fileMigration });
        if (!dryRun) {
          await updateRecord(dbClient, table, record.id, update);
        }
      }
    }

    if (dryRun) {
      await dbClient.query('ROLLBACK');
    } else {
      await dbClient.query('COMMIT');
      committed = true;
    }

    if (!dryRun && committed) {
      for (const item of updates) {
        if (item.fileMigration?.targetCommitPath && item.fileMigration?.createdPath) {
          try {
            await fs.rename(item.fileMigration.createdPath, item.fileMigration.targetCommitPath);
          } catch (_) {
            // Best-effort rename
          }
        }
        if (item.fileMigration?.cleanupAfterCommit) {
          try {
            await fs.rm(item.fileMigration.cleanupAfterCommit, { force: true });
          } catch (_) {
            // Best-effort cleanup
          }
        }
      }
    }

    return {
      scanned: records.length,
      migrated: updates.length,
      unchanged: records.length - updates.length,
    };
  } catch (error) {
    if (!committed) {
      try {
        await dbClient.query('ROLLBACK');
      } catch (_) {
        // Preserva o erro original
      }
    }
    for (const fm of fileMigrations) {
      if (fm?.createdPath) {
        try {
          await fs.rm(fm.createdPath, { force: true });
        } catch (_) {
          // Ignora erro de limpeza temporária no rollback
        }
      }
    }
    throw error;
  } finally {
    if (!isDedicatedClient) {
      dbClient.release();
    }
  }
}

async function migrateRecord(pool, table, record, options = {}) {
  const batchResult = await migrateBatch(pool, table, [record], options);
  return {
    changed: batchResult.migrated > 0,
    id: record.id,
  };
}

async function getEncryptionStatus(pool, options = {}) {
  const currentVersion = options.currentVersion || cryptoService.getCurrentVersion();
  const status = {};
  const tables = options.table ? [options.table] : Object.keys(ENCRYPTED_FIELDS);

  for (const table of tables) {
    const dbClient = await pool.connect();
    try {
      if (!(await tableExists(dbClient, table))) continue;
      const result = await dbClient.query(
        `SELECT
           COUNT(*)::INTEGER AS total,
           COUNT(*) FILTER (WHERE encryption_key_version = $1)::INTEGER AS current_version_count,
           COUNT(*) FILTER (WHERE encryption_key_version IS NULL OR encryption_key_version < $1)::INTEGER AS legacy_count
         FROM ${quoteIdentifier(table)}`,
        [currentVersion]
      );
      const row = result.rows[0] || {};
      const total = Number(row.total || 0);
      const current = Number(row.current_version_count || 0);
      const legacy = Number(row.legacy_count || 0);
      status[table] = {
        total,
        currentVersion: current,
        legacyOrPlaintext: legacy,
        pending: legacy,
      };
    } finally {
      dbClient.release();
    }
  }
  return status;
}

async function migrateExistingData(pool, options = {}) {
  const limit = Number(options.limit || 0);
  const batchSize = Math.max(1, Number(options.batchSize || 100));
  const currentVersion = cryptoService.getCurrentVersion();
  const pendingOnly = options.pendingOnly !== false;
  const targetTables = options.table ? [options.table] : Object.keys(ENCRYPTED_FIELDS);

  const summary = {
    errors: [],
    interrupted: false,
    migrated: 0,
    orphanFilesMigrated: 0,
    orphanFilesScanned: 0,
    scanned: 0,
    unchanged: 0,
  };

  for (const table of targetTables) {
    let lastId = 0;
    let tableProcessed = 0;

    while (true) {
      if (options.shouldStop && options.shouldStop()) {
        summary.interrupted = true;
        break;
      }

      if (limit > 0 && summary.scanned >= limit) break;
      const effectiveBatchSize = limit > 0
        ? Math.min(batchSize, limit - summary.scanned)
        : batchSize;

      const dbClient = await pool.connect();
      let rows = [];
      try {
        if (!(await tableExists(dbClient, table))) break;

        const whereClause = pendingOnly
          ? `WHERE id > $1 AND (encryption_key_version IS NULL OR encryption_key_version < $2)`
          : `WHERE id > $1`;
        const queryParams = pendingOnly
          ? [lastId, currentVersion, effectiveBatchSize]
          : [lastId, effectiveBatchSize];
        const limitParamIndex = queryParams.length;

        const result = await dbClient.query(
          `SELECT * FROM ${quoteIdentifier(table)}
           ${whereClause}
           ORDER BY id ASC
           LIMIT $${limitParamIndex}`,
          queryParams
        );
        rows = result.rows;
      } finally {
        dbClient.release();
      }

      if (rows.length === 0) break;

      lastId = rows[rows.length - 1].id;
      tableProcessed += rows.length;

      try {
        const batchResult = await migrateBatch(pool, table, rows, options);
        summary.scanned += batchResult.scanned;
        summary.migrated += batchResult.migrated;
        summary.unchanged += batchResult.unchanged;
      } catch (error) {
        summary.scanned += rows.length;
        summary.errors.push({
          batchStartId: rows[0].id,
          batchEndId: rows[rows.length - 1].id,
          message: error.message,
          table,
        });
        if (options.stopOnError) throw error;
      }

      if (options.shouldStop && options.shouldStop()) {
        summary.interrupted = true;
        break;
      }

      if (limit > 0 && summary.scanned >= limit) break;
    }

    if (summary.interrupted) break;
  }

  if (!summary.interrupted && options.migrateOrphanFiles === true) {
    const orphanSummary = await migrateOrphanFiles(pool, options);
    summary.orphanFilesMigrated = orphanSummary.migrated;
    summary.orphanFilesScanned = orphanSummary.scanned;
    summary.errors.push(...orphanSummary.errors);
  }

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
  getEncryptionStatus,
  isEncryptedFile,
  migrateBatch,
  migrateExistingData,
  migrateOrphanFiles,
  migrateRecord,
  pathExists,
  prepareDocumentFile,
  recordNeedsEncryption,
};
