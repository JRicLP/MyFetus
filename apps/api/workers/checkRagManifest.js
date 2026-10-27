/**
 * checkRagManifest.js
 *
 * Confere os PDFs de data/guidelines contra o manifesto, sem extrair nem
 * ingerir nada. Mostra o que seria liberado e o que seria bloqueado.
 * Sai com código 1 se a ingestão estiver bloqueada.
 */

const path = require('path');

const {
  ManifestGateError,
  assertIngestionAllowed,
  evaluateGuidelines,
  loadManifest,
} = require('../services/ragManifestGate');

const GUIDELINES_DIR = path.join(__dirname, '..', 'data', 'guidelines');

function main() {
  const manifest = loadManifest();
  const result = evaluateGuidelines({ guidelinesDir: GUIDELINES_DIR, manifest });

  console.log(`Manifesto versão ${result.manifestVersion}`);
  console.log(`Liberados: ${result.approved.length}`);
  for (const item of result.approved) {
    console.log(`  OK        ${item.fileName}`);
  }
  console.log(`Bloqueados: ${result.blocked.length}`);
  for (const item of result.blocked) {
    console.log(`  BLOQUEADO ${item.fileName} [${item.code}] ${item.reason}`);
  }

  assertIngestionAllowed(result);
  console.log('Ingestão liberada pelo manifesto.');
}

try {
  main();
} catch (error) {
  if (error instanceof ManifestGateError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
