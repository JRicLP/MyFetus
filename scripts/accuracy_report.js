const fs = require('fs/promises');
const path = require('path');
const { extractDocumentText } = require('../apps/api/services/pdfTextExtractor');

const ROOT_DIR = path.resolve(__dirname, '..');
const PDF_ROOT = path.join(ROOT_DIR, 'tests', 'fixtures', 'pdfs');
const REPORTS_DIR = path.join(ROOT_DIR, 'reports');

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
  return `${columns[0].padEnd(30)} | ${columns[1].padEnd(7)} | ${String(columns[2]).padStart(3)} | ${String(columns[3]).padStart(8)}`;
}

async function run() {
  const groups = new Map();

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
      const key = `${truth.document_type}:${result.method}`;
      const current = groups.get(key) || {
        documentType: truth.document_type,
        method: result.method,
        count: 0,
        score: 0,
      };

      current.count += 1;
      current.score += overlap;
      groups.set(key, current);
    }
  }

  const lines = [
    formatRow(['Tipo de documento', 'Metodo', 'Qtd', 'Acuracia']),
    formatRow(['-----------------', '------', '---', '--------']),
  ];

  for (const group of groups.values()) {
    lines.push(formatRow([
      group.documentType,
      group.method,
      group.count,
      `${((group.score / group.count) * 100).toFixed(1)}%`,
    ]));
  }

  if (lines.length === 2) {
    lines.push('Nenhum fixture encontrado. Rode npm run generate:dataset primeiro.');
  }

  const report = `${lines.join('\n')}\n`;
  console.log(report);

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await fs.writeFile(path.join(REPORTS_DIR, `accuracy_${stamp}.txt`), report);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
