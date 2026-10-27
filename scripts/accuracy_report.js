const fs = require('fs/promises');
const path = require('path');
const { extractDocumentText } = require('../apps/api/services/pdfTextExtractor');

const ROOT_DIR = path.resolve(__dirname, '..');
const PDF_ROOT = path.join(ROOT_DIR, 'tests', 'fixtures', 'pdfs');
const REPORTS_DIR = path.join(ROOT_DIR, 'reports');
const SCHEMA_PATH = path.join(ROOT_DIR, 'tests', 'fixtures', 'dataset_schema.json');

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function tokenOverlap(extractedText, truth) {
  const expected = tokenize([
    truth.document_type,
    ...Object.values(truth.fields),
  ].join(' '));
  const extracted = new Set(tokenize(extractedText));
  const matched = expected.filter((token) => extracted.has(token));

  return expected.length ? matched.length / expected.length : 1;
}

async function loadCases(kind) {
  const dir = path.join(PDF_ROOT, kind);

  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((name) => name.endsWith('.ground_truth.json'))
      .map((name) => ({ dir, truthPath: path.join(dir, name) }));
  } catch (err) {
    return [];
  }
}

function formatRow(columns) {
  return `${columns[0].padEnd(30)} | ${columns[1].padEnd(7)} | ${String(columns[2]).padStart(3)} | ${String(columns[3]).padStart(8)} | ${String(columns[4]).padStart(7)} | ${String(columns[5]).padStart(7)}`;
}

async function run() {
  const schema = JSON.parse(await fs.readFile(SCHEMA_PATH, 'utf8'));
  const thresholds = schema.success_thresholds || { pdfjs_token_overlap: 0.9, ocr_token_overlap: 0.7 };
  const groups = new Map();
  const results = [];
  const metadata = {
    laboratories: new Set(),
    layouts: new Set(),
    difficulties: new Set(),
  };

  for (const kind of ['native', 'scanned']) {
    const cases = await loadCases(kind);

    for (const item of cases) {
      const truth = JSON.parse(await fs.readFile(item.truthPath, 'utf8'));
      const pdfPath = path.join(item.dir, truth.file_name);
      const result = await extractDocumentText({
        file_path: pdfPath,
        document_type: 'pdf',
      });
      const overlap = tokenOverlap(result.text, truth);
      const threshold = result.method === 'ocr'
        ? thresholds.ocr_token_overlap
        : thresholds.pdfjs_token_overlap;
      results.push({ truth, result, overlap, threshold });
      if (truth.laboratory) metadata.laboratories.add(truth.laboratory);
      if (truth.layout) metadata.layouts.add(truth.layout);
      if (truth.difficulty) metadata.difficulties.add(truth.difficulty);
      const key = `${truth.document_type}:${result.method}`;
      const current = groups.get(key) || {
        documentType: truth.document_type,
        method: result.method,
        count: 0,
        score: 0,
        minimum: 1,
        failures: 0,
      };

      current.count += 1;
      current.score += overlap;
      current.minimum = Math.min(current.minimum, overlap);
      if (overlap < threshold) current.failures += 1;
      groups.set(key, current);
    }
  }

  const lines = [
    formatRow(['Tipo de documento', 'Metodo', 'Qtd', 'Media', 'Minimo', 'Falhas']),
    formatRow(['-----------------', '------', '---', '-----', '-------', '------']),
  ];

  for (const group of groups.values()) {
    lines.push(formatRow([
      group.documentType,
      group.method,
      group.count,
      `${((group.score / group.count) * 100).toFixed(1)}%`,
      `${(group.minimum * 100).toFixed(1)}%`,
      group.failures,
    ]));
  }

  if (lines.length === 2) {
    lines.push('Nenhum fixture encontrado. Rode npm run generate:dataset primeiro.');
  }

  lines.push('');
  lines.push(`Total de documentos: ${results.length}`);
  lines.push(`Laboratorios ficticios: ${metadata.laboratories.size}`);
  lines.push(`Layouts: ${metadata.layouts.size}`);
  lines.push(`Dificuldades: ${metadata.difficulties.size}`);
  lines.push('Acuracia = sobreposicao de tokens extraidos; nao representa qualidade clinica.');

  const report = `${lines.join('\n')}\n`;
  console.log(report);

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await fs.writeFile(path.join(REPORTS_DIR, `accuracy_${stamp}.txt`), report);

  const nativeCount = results.filter(({ result }) => result.method === 'pdfjs').length;
  const ocrCount = results.filter(({ result }) => result.method === 'ocr').length;
  const requireOcr = process.env.REQUIRE_OCR === 'true';
  const errors = [];

  if (nativeCount < 30) errors.push(`dataset nativo insuficiente: ${nativeCount} (minimo 30)`);
  if (metadata.laboratories.size < 3) errors.push(`laboratorios ficticios insuficientes: ${metadata.laboratories.size} (minimo 3)`);
  if (requireOcr && ocrCount < 10) errors.push(`dataset OCR insuficiente: ${ocrCount} (minimo 10)`);
  if (requireOcr && !results.some(({ result }) => result.method === 'ocr')) {
    errors.push('nenhum caso foi processado pelo metodo OCR');
  }
  for (const item of results) {
    if (item.overlap < item.threshold) {
      errors.push(`${item.truth.file_name}: ${(item.overlap * 100).toFixed(1)}% abaixo do limiar ${(item.threshold * 100).toFixed(1)}%`);
    }
  }

  if (errors.length) {
    console.error(`\nFalhas de cobertura/acuracia (${errors.length}):`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
