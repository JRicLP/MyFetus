const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { argumentValue } = require('./cli-utils');
const logger = require('../utils/logger');

require('dotenv').config({
  path: process.env.ENV_FILE_PATH
    ? path.resolve(process.env.ENV_FILE_PATH)
    : path.resolve(__dirname, '../../../.env'),
});

const AUDIT_ACTIONS = Object.freeze({
  DOCUMENT_INTEGRITY_ANOMALY: 'DOCUMENT_INTEGRITY_ANOMALY',
  STORAGE_CLEANUP_QUARANTINE: 'STORAGE_CLEANUP_QUARANTINE',
});

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function computeFileSha256(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function scanOrphanUploads(pool, options = {}) {
  const uploadsDir = path.resolve(
    options.uploadsDir || process.env.DOCUMENT_STORAGE_DIR || 'uploads'
  );
  const encryptedDir = path.join(uploadsDir, 'encrypted');
  const quarantineDir = options.quarantineDir || path.join(uploadsDir, '.quarantine');
  const graceHours = Number(options.graceHours || process.env.ORPHAN_GRACE_HOURS || 24);
  const gracePeriodMs = graceHours * 60 * 60 * 1000;
  const now = Date.now();

  // 1. Obter registros do banco
  const dbClient = await pool.connect();
  let dbRows = [];
  try {
    const result = await dbClient.query(
      `SELECT id, pregnant_id, file_path, extraction_status
         FROM pregnant_documents
        WHERE file_path IS NOT NULL`
    );
    dbRows = result.rows || [];
  } finally {
    dbClient.release();
  }

  const referencedPaths = new Set();
  const missingFiles = [];

  for (const row of dbRows) {
    const resolvedPath = path.resolve(row.file_path);
    referencedPaths.add(resolvedPath);

    if (!(await pathExists(resolvedPath))) {
      missingFiles.push({
        id: row.id,
        pregnantId: row.pregnant_id,
        filePath: row.file_path,
        extractionStatus: row.extraction_status,
      });
    }
  }

  const orphanFiles = [];
  const recentPreserved = [];

  // Helper para escanear diretório
  async function scanDirectory(targetDir, category, fileFilter = () => true) {
    if (!(await pathExists(targetDir))) return;
    const entries = await fs.readdir(targetDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) continue;
      if (!fileFilter(entry.name)) continue;

      const fullPath = path.join(targetDir, entry.name);
      const resolvedPath = path.resolve(fullPath);

      if (referencedPaths.has(resolvedPath)) {
        continue;
      }

      const stat = await fs.stat(fullPath);
      const ageMs = now - stat.mtimeMs;

      if (ageMs < gracePeriodMs) {
        recentPreserved.push({
          path: fullPath,
          ageHours: Number((ageMs / (60 * 60 * 1000)).toFixed(2)),
        });
      } else {
        const sha256 = await computeFileSha256(fullPath);
        orphanFiles.push({
          path: fullPath,
          relativePath: path.relative(uploadsDir, fullPath),
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          sha256,
          category,
        });
      }
    }
  }

  // Varredura de temporários na raiz de uploads
  await scanDirectory(uploadsDir, 'temp_orphan');
  // Varredura de cifrados em uploads/encrypted (apenas arquivos com extensão .mfe)
  await scanDirectory(encryptedDir, 'encrypted_orphan', (name) => name.endsWith('.mfe'));

  const totalBytes = orphanFiles.reduce((acc, f) => acc + f.size, 0);

  return {
    timestamp: new Date().toISOString(),
    graceHours,
    summary: {
      orphanCount: orphanFiles.length,
      orphanBytes: totalBytes,
      recentPreservedCount: recentPreserved.length,
      missingCount: missingFiles.length,
    },
    orphanFiles,
    missingFiles,
    recentPreserved,
  };
}

async function executeCleanupFromManifest(pool, options = {}) {
  const manifestPath = options.manifestPath;
  if (!manifestPath) {
    throw new Error('Caminho do manifesto (--manifest=<path>) e obrigatorio para execucao.');
  }

  const manifestContent = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);

  const uploadsDir = path.resolve(
    options.uploadsDir || process.env.DOCUMENT_STORAGE_DIR || 'uploads'
  );
  const quarantineDir = options.quarantineDir || path.join(uploadsDir, '.quarantine');
  const batchId = Date.now().toString();
  const destinationFolder = path.join(quarantineDir, batchId);

  let quarantinedCount = 0;
  let flaggedMissingCount = 0;

  // 1. Mover arquivos órfãos para quarentena
  for (const orphan of manifest.orphanFiles || []) {
    if (await pathExists(orphan.path)) {
      const destPath = path.join(destinationFolder, orphan.relativePath);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.rename(orphan.path, destPath);
      quarantinedCount += 1;
    }
  }

  // 2. Sinalizar inconsistências no banco sem exclusão de registros
  const dbClient = pool ? await pool.connect() : null;
  try {
    for (const missing of manifest.missingFiles || []) {
      if (dbClient) {
        await dbClient.query(
          `UPDATE pregnant_documents
              SET extraction_status = 'failed',
                  extraction_error = 'INTEGRITY_ERROR_FILE_MISSING',
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [missing.id]
        );

        await dbClient.query(
          `INSERT INTO audit_logs (
             action, resource, resource_id, outcome, detail
           ) VALUES ($1, $2, $3, $4, $5)`,
          [
            AUDIT_ACTIONS.DOCUMENT_INTEGRITY_ANOMALY,
            'pregnant_documents',
            String(missing.id),
            'WARNING',
            JSON.stringify({
              pregnant_id: missing.pregnantId,
              file_path: missing.filePath,
              detected_by: 'cleanup-orphan-uploads',
            }),
          ]
        );
      }
      flaggedMissingCount += 1;
    }

    if (dbClient && quarantinedCount > 0) {
      await dbClient.query(
        `INSERT INTO audit_logs (
           action, resource, outcome, detail
         ) VALUES ($1, $2, $3, $4)`,
        [
          AUDIT_ACTIONS.STORAGE_CLEANUP_QUARANTINE,
          'uploads',
          'SUCCESS',
          JSON.stringify({
            manifest_file: path.basename(manifestPath),
            quarantined_count: quarantinedCount,
            quarantine_folder: batchId,
          }),
        ]
      );
    }
  } finally {
    if (dbClient) dbClient.release();
  }

  // 3. Purge preventivo de quarentenas antigas (> N dias) se configurado
  const purgeDays = Number(options.purgeQuarantineDays || 0);
  let purgedFoldersCount = 0;
  if (purgeDays > 0 && (await pathExists(quarantineDir))) {
    const quarantineEntries = await fs.readdir(quarantineDir, { withFileTypes: true });
    const maxAgeMs = purgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const entry of quarantineEntries) {
      if (!entry.isDirectory()) continue;
      const folderPath = path.join(quarantineDir, entry.name);
      const stat = await fs.stat(folderPath);
      if (now - stat.mtimeMs > maxAgeMs) {
        await fs.rm(folderPath, { recursive: true, force: true });
        purgedFoldersCount += 1;
      }
    }
  }

  return {
    quarantinedCount,
    flaggedMissingCount,
    quarantineFolder: destinationFolder,
    purgedFoldersCount,
  };
}

async function main() {
  const client = require('../backend');
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const dryRun = !execute || args.includes('--dry-run');
  const manifestArg = argumentValue('--manifest');
  const graceHours = Number(argumentValue('--grace-hours') || 24);
  const purgeDays = Number(argumentValue('--purge-quarantine-older-than-days') || 0);
  const customOutput = argumentValue('--output');

  logger.info('Iniciando rotina de higienização e auditoria de uploads (LGPD)', {
    mode: dryRun ? 'DRY_RUN' : 'EXECUTE',
    graceHours,
    purgeDays: purgeDays || null,
  });

  try {
    if (dryRun) {
      logger.info('Executando varredura em disco e checagem de integridade com o banco...');
      const report = await scanOrphanUploads(client, { graceHours });

      const reportsDir = path.resolve(__dirname, '../../../reports');
      await fs.mkdir(reportsDir, { recursive: true });
      const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
      const outputPath = customOutput
        ? path.resolve(customOutput)
        : path.join(reportsDir, `orphan-manifest-${timestampStr}.json`);

      await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');

      logger.info('Varredura diagnóstica de uploads concluída com sucesso', {
        summary: report.summary,
        manifestFile: outputPath,
      });
      return;
    }

    if (!manifestArg) {
      logger.error('Manifesto ausente para execução ativa', {
        instruction: 'Para executar a limpeza ativa (--execute), informe o manifesto gerado pelo dry-run via --manifest=<caminho>',
      });
      process.exit(1);
    }

    logger.info('Consumindo manifesto aprovado para quarentena', {
      manifestPath: manifestArg,
    });
    const result = await executeCleanupFromManifest(client, {
      manifestPath: path.resolve(manifestArg),
      purgeQuarantineDays: purgeDays,
    });

    logger.info('Limpeza e movimentação para quarentena concluídas com sucesso', {
      quarantinedCount: result.quarantinedCount,
      quarantineFolder: result.quarantineFolder,
      flaggedMissingCount: result.flaggedMissingCount,
      purgedQuarantineFolders: purgeDays > 0 ? result.purgedFoldersCount : undefined,
    });
  } finally {
    try {
      await client.end();
    } catch (closeError) {
      logger.warn('Falha ao encerrar conexão do banco de dados', {
        error: closeError.message,
      });
    }
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      logger.error('Erro fatal durante a limpeza de uploads', {
        error: error.message,
        stack: error.stack,
      });
      process.exitCode = 1;
    });
}

module.exports = {
  AUDIT_ACTIONS,
  executeCleanupFromManifest,
  pathExists,
  scanOrphanUploads,
};
