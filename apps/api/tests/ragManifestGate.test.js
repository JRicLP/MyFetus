const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const {
  DEFAULT_MANIFEST_PATH,
  ManifestGateError,
  PUBLIC_METADATA_FIELDS,
  assertIngestionAllowed,
  buildSourceMetadata,
  evaluateGuidelines,
  loadManifest,
  validateManifest,
} = require('../services/ragManifestGate');

// PDF sintético: só bytes de teste, sem conteúdo clínico nem dado de paciente.
const SYNTHETIC_PDF = Buffer.from('%PDF-1.4\n% documento sintetico de teste do gate\n%%EOF\n');
const SYNTHETIC_SHA256 = crypto.createHash('sha256').update(SYNTHETIC_PDF).digest('hex');

function makeSource(overrides = {}) {
  return {
    documentId: 'fonte-sintetica-2026',
    title: 'Fonte sintética de teste',
    issuer: 'Equipe MyFetus',
    edition: '1ª edição',
    year: 2026,
    language: 'pt-BR',
    documentType: 'manual',
    sourceUrl: 'https://example.org/fonte-sintetica.pdf',
    license: 'CC BY 4.0',
    sha256: SYNTHETIC_SHA256,
    topics: ['teste'],
    state: 'aprovado',
    approval: { by: 'P.O. (teste)', date: '2026-10-21' },
    ...overrides,
  };
}

function makeManifest(sources) {
  return { manifestVersion: '9.9.9-test', hashAlgorithm: 'sha256', sources };
}

const tempDirs = [];
test.after(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function makeGuidelinesDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-gate-'));
  tempDirs.push(dir);
  for (const [fileName, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, fileName), content);
  }
  return dir;
}

test('libera PDF aprovado, com responsável, data e hash iguais ao manifesto', () => {
  const dir = makeGuidelinesDir({ 'fonte-sintetica-2026.pdf': SYNTHETIC_PDF });
  const result = evaluateGuidelines({ guidelinesDir: dir, manifest: makeManifest([makeSource()]) });

  assert.strictEqual(result.blocked.length, 0);
  assert.strictEqual(result.approved.length, 1);
  assert.strictEqual(result.approved[0].source.documentId, 'fonte-sintetica-2026');
  assert.doesNotThrow(() => assertIngestionAllowed(result));
});

test('bloqueia fonte que não está aprovada', () => {
  for (const state of ['proposta', 'ajustar', 'rejeitado', 'substituido', 'suspenso']) {
    const dir = makeGuidelinesDir({ 'fonte-sintetica-2026.pdf': SYNTHETIC_PDF });
    const result = evaluateGuidelines({
      guidelinesDir: dir,
      manifest: makeManifest([makeSource({ state })]),
    });

    assert.strictEqual(result.approved.length, 0, state);
    assert.strictEqual(result.blocked[0].code, 'NOT_APPROVED', state);
    assert.throws(() => assertIngestionAllowed(result), ManifestGateError);
  }
});

test('bloqueia PDF com hash diferente do aprovado (arquivo alterado exige nova aprovação)', () => {
  const dir = makeGuidelinesDir({
    'fonte-sintetica-2026.pdf': Buffer.concat([SYNTHETIC_PDF, Buffer.from('alterado')]),
  });
  const result = evaluateGuidelines({ guidelinesDir: dir, manifest: makeManifest([makeSource()]) });

  assert.strictEqual(result.blocked[0].code, 'HASH_MISMATCH');
  assert.throws(() => assertIngestionAllowed(result), /SHA-256 do arquivo difere/);
});

test('bloqueia PDF que não está no manifesto', () => {
  const dir = makeGuidelinesDir({ 'documento-desconhecido.pdf': SYNTHETIC_PDF });
  const result = evaluateGuidelines({ guidelinesDir: dir, manifest: makeManifest([makeSource()]) });

  assert.strictEqual(result.blocked[0].code, 'NOT_IN_MANIFEST');
});

test('bloqueia aprovação sem responsável ou data', () => {
  for (const approval of [null, { by: '', date: '2026-10-21' }, { by: 'P.O.', date: '' }]) {
    const dir = makeGuidelinesDir({ 'fonte-sintetica-2026.pdf': SYNTHETIC_PDF });
    const result = evaluateGuidelines({
      guidelinesDir: dir,
      manifest: makeManifest([makeSource({ approval })]),
    });

    assert.strictEqual(result.blocked[0].code, 'APPROVAL_INCOMPLETE');
  }
});

test('bloqueia fonte aprovada sem hash registrado', () => {
  const dir = makeGuidelinesDir({ 'fonte-sintetica-2026.pdf': SYNTHETIC_PDF });
  const result = evaluateGuidelines({
    guidelinesDir: dir,
    manifest: makeManifest([makeSource({ sha256: null })]),
  });

  assert.strictEqual(result.blocked[0].code, 'HASH_MISSING');
});

test('um arquivo bloqueado interrompe a ingestão inteira, mesmo com outros liberados', () => {
  const dir = makeGuidelinesDir({
    'fonte-sintetica-2026.pdf': SYNTHETIC_PDF,
    'documento-desconhecido.pdf': SYNTHETIC_PDF,
  });
  const result = evaluateGuidelines({ guidelinesDir: dir, manifest: makeManifest([makeSource()]) });

  assert.strictEqual(result.approved.length, 1);
  assert.strictEqual(result.blocked.length, 1);
  assert.throws(() => assertIngestionAllowed(result), /Ingestão bloqueada pelo manifesto/);
});

test('pasta sem PDFs aprovados falha explicitamente', () => {
  const dir = makeGuidelinesDir({});
  const result = evaluateGuidelines({ guidelinesDir: dir, manifest: makeManifest([makeSource()]) });

  assert.throws(() => assertIngestionAllowed(result), /Nenhum PDF aprovado/);
});

test('pasta inexistente falha explicitamente', () => {
  assert.throws(
    () => evaluateGuidelines({ guidelinesDir: '/caminho/que/nao/existe', manifest: makeManifest([]) }),
    /Pasta de diretrizes não encontrada/
  );
});

test('metadados dos vetores usam só campos públicos do manifesto', () => {
  const source = makeSource({ approval: { by: 'Nome do P.O.', date: '2026-10-21' }, extra: 'nao deve vazar' });
  const metadata = buildSourceMetadata(source, '9.9.9-test');
  const allowed = new Set([...PUBLIC_METADATA_FIELDS, 'manifestVersion']);

  for (const key of Object.keys(metadata)) {
    assert.ok(allowed.has(key), `campo inesperado nos metadados: ${key}`);
  }
  assert.strictEqual(metadata.sha256, SYNTHETIC_SHA256);
  assert.strictEqual(metadata.manifestVersion, '9.9.9-test');
  assert.strictEqual(metadata.approval, undefined);
  assert.strictEqual(metadata.extra, undefined);
});

test('validateManifest rejeita manifesto malformado', () => {
  const cases = [
    { ...makeManifest([makeSource()]), hashAlgorithm: 'md5' },
    makeManifest([makeSource(), makeSource()]),
    makeManifest([makeSource({ state: 'aprovadissimo' })]),
    makeManifest([makeSource({ sha256: 'ABC' })]),
    makeManifest([makeSource({ documentId: 'Nome Com Espaço' })]),
    { hashAlgorithm: 'sha256', sources: [] },
  ];

  for (const manifest of cases) {
    assert.throws(() => validateManifest(manifest), ManifestGateError);
  }
});

test('loadManifest falha se o arquivo não existe ou não é JSON', () => {
  assert.throws(() => loadManifest('/caminho/inexistente.json'), /Manifesto não encontrado/);

  const dir = makeGuidelinesDir({ 'manifesto.json': 'isto nao e json' });
  assert.throws(() => loadManifest(path.join(dir, 'manifesto.json')), /não é um JSON válido/);
});

test('manifesto do repositório é válido e não libera nenhuma fonte sem aprovação do P.O.', () => {
  const manifest = loadManifest(DEFAULT_MANIFEST_PATH);

  for (const source of manifest.sources) {
    if (source.state === 'aprovado') {
      assert.ok(source.approval && source.approval.by && source.approval.date, source.documentId);
      assert.ok(source.sha256, source.documentId);
    }
  }
});

test('manifesto JSON está sincronizado com docs/rag/manifesto.md', (t) => {
  const markdownPath = path.join(__dirname, '..', '..', '..', 'docs', 'rag', 'manifesto.md');
  if (!fs.existsSync(markdownPath)) {
    t.skip('docs/rag/manifesto.md não está disponível neste ambiente (ex.: imagem Docker da API).');
    return;
  }

  const markdown = fs.readFileSync(markdownPath, 'utf8');
  const manifest = loadManifest(DEFAULT_MANIFEST_PATH);

  assert.ok(
    markdown.includes(`Versão do manifesto | ${manifest.manifestVersion}`),
    'manifestVersion do JSON difere do Markdown'
  );
  for (const source of manifest.sources) {
    assert.ok(markdown.includes(source.documentId), `${source.documentId} não aparece no Markdown`);
    if (source.sha256) {
      assert.ok(markdown.includes(source.sha256), `SHA-256 de ${source.documentId} difere do Markdown`);
    }
  }
});
