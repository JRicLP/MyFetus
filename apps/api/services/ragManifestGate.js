/**
 * ragManifestGate.js
 *
 * Gate do manifesto de fontes do RAG (E4-02.1).
 *
 * Antes de qualquer extração ou embedding, confere cada PDF da pasta de
 * diretrizes contra o manifesto (docs/rag/manifesto.md, versão legível por
 * máquina em data/rag-manifest.json):
 * - o arquivo precisa se chamar <documentId>.pdf e existir no manifesto;
 * - a fonte precisa estar com estado "aprovado", com responsável e data;
 * - o SHA-256 do arquivo precisa ser igual ao registrado.
 *
 * Qualquer arquivo bloqueado interrompe a ingestão inteira (fail closed).
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_MANIFEST_PATH = path.join(__dirname, '..', 'data', 'rag-manifest.json');
const APPROVED_STATE = 'aprovado';
const VALID_STATES = ['proposta', 'aprovado', 'ajustar', 'rejeitado', 'substituido', 'suspenso'];
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

// Campos do manifesto que podem ir para os metadados dos vetores. São todos
// dados públicos da publicação; nada vem do conteúdo do PDF nem do usuário.
const PUBLIC_METADATA_FIELDS = [
  'documentId',
  'title',
  'issuer',
  'edition',
  'year',
  'language',
  'documentType',
  'sourceUrl',
  'license',
  'sha256',
];

const BLOCK_REASONS = {
  NOT_IN_MANIFEST: 'Arquivo não corresponde a nenhuma fonte do manifesto (nome esperado: <documentId>.pdf).',
  NOT_APPROVED: 'Fonte não está aprovada no manifesto.',
  APPROVAL_INCOMPLETE: 'Fonte aprovada sem responsável ou data de aprovação.',
  HASH_MISSING: 'Fonte aprovada sem SHA-256 registrado.',
  HASH_MISMATCH: 'SHA-256 do arquivo difere do registrado; o arquivo mudou e precisa de nova aprovação.',
};

class ManifestGateError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ManifestGateError';
    this.details = details;
  }
}

function validateManifest(manifest) {
  const errors = [];

  if (!manifest || typeof manifest !== 'object') {
    throw new ManifestGateError('Manifesto inválido: conteúdo não é um objeto.');
  }
  if (manifest.hashAlgorithm !== 'sha256') {
    errors.push('hashAlgorithm deve ser "sha256".');
  }
  if (typeof manifest.manifestVersion !== 'string' || manifest.manifestVersion.length === 0) {
    errors.push('manifestVersion é obrigatório.');
  }
  if (!Array.isArray(manifest.sources)) {
    errors.push('sources deve ser uma lista.');
  }

  const seenIds = new Set();
  for (const [index, source] of (manifest.sources || []).entries()) {
    const label = source && source.documentId ? source.documentId : `sources[${index}]`;

    if (!source || typeof source.documentId !== 'string' || !/^[a-z0-9-]+$/.test(source.documentId)) {
      errors.push(`${label}: documentId ausente ou fora do padrão [a-z0-9-].`);
      continue;
    }
    if (seenIds.has(source.documentId)) {
      errors.push(`${label}: documentId duplicado.`);
    }
    seenIds.add(source.documentId);

    if (!VALID_STATES.includes(source.state)) {
      errors.push(`${label}: estado "${source.state}" inválido.`);
    }
    if (source.sha256 !== null && source.sha256 !== undefined && !SHA256_PATTERN.test(source.sha256)) {
      errors.push(`${label}: sha256 deve ter 64 caracteres hexadecimais minúsculos.`);
    }
  }

  if (errors.length > 0) {
    throw new ManifestGateError('Manifesto inválido.', { errors });
  }

  return manifest;
}

function loadManifest(manifestPath = process.env.RAG_MANIFEST_PATH || DEFAULT_MANIFEST_PATH) {
  if (!fs.existsSync(manifestPath)) {
    throw new ManifestGateError(`Manifesto não encontrado: ${manifestPath}`);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new ManifestGateError(`Manifesto não é um JSON válido: ${manifestPath}`);
  }

  return validateManifest(manifest);
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function checkFile(filePath, source) {
  if (!source) return 'NOT_IN_MANIFEST';
  if (source.state !== APPROVED_STATE) return 'NOT_APPROVED';
  if (!source.approval || !source.approval.by || !source.approval.date) return 'APPROVAL_INCOMPLETE';
  if (!source.sha256) return 'HASH_MISSING';
  if (sha256File(filePath) !== source.sha256) return 'HASH_MISMATCH';
  return null;
}

/**
 * Classifica cada PDF da pasta em liberado ou bloqueado, sem ingerir nada.
 */
function evaluateGuidelines({ guidelinesDir, manifest }) {
  if (!fs.existsSync(guidelinesDir)) {
    throw new ManifestGateError(`Pasta de diretrizes não encontrada: ${guidelinesDir}`);
  }

  const sourcesById = new Map(manifest.sources.map((source) => [source.documentId, source]));
  const pdfFiles = fs
    .readdirSync(guidelinesDir)
    .filter((fileName) => fileName.toLowerCase().endsWith('.pdf'))
    .sort();

  const approved = [];
  const blocked = [];

  for (const fileName of pdfFiles) {
    const filePath = path.join(guidelinesDir, fileName);
    const documentId = fileName.replace(/\.pdf$/i, '');
    const source = sourcesById.get(documentId);
    const code = checkFile(filePath, source);

    if (code) {
      blocked.push({
        fileName,
        documentId,
        state: source ? source.state : null,
        code,
        reason: BLOCK_REASONS[code],
      });
    } else {
      approved.push({ fileName, filePath, source });
    }
  }

  return { manifestVersion: manifest.manifestVersion, approved, blocked };
}

/**
 * Interrompe a ingestão se houver qualquer arquivo bloqueado ou nenhum liberado.
 */
function assertIngestionAllowed(result) {
  if (result.blocked.length > 0) {
    const summary = result.blocked.map((item) => `${item.fileName}: ${item.reason}`).join('\n');
    throw new ManifestGateError(
      `Ingestão bloqueada pelo manifesto (${result.blocked.length} arquivo(s)):\n${summary}`,
      { blocked: result.blocked }
    );
  }
  if (result.approved.length === 0) {
    throw new ManifestGateError('Nenhum PDF aprovado no manifesto para ingerir.');
  }
  return result;
}

function buildSourceMetadata(source, manifestVersion) {
  const metadata = { manifestVersion };
  for (const field of PUBLIC_METADATA_FIELDS) {
    if (source[field] !== null && source[field] !== undefined) {
      metadata[field] = source[field];
    }
  }
  return metadata;
}

module.exports = {
  APPROVED_STATE,
  BLOCK_REASONS,
  DEFAULT_MANIFEST_PATH,
  ManifestGateError,
  PUBLIC_METADATA_FIELDS,
  assertIngestionAllowed,
  buildSourceMetadata,
  evaluateGuidelines,
  loadManifest,
  sha256File,
  validateManifest,
};
