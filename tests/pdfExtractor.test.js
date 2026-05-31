const fs = require('fs');
const path = require('path');
const { generateDataset } = require('../scripts/generate_dataset');
const { extractDocumentText } = require('../apps/api/services/pdfTextExtractor');

const ROOT_DIR = path.resolve(__dirname, '..');
const NATIVE_DIR = path.join(ROOT_DIR, 'tests', 'fixtures', 'pdfs', 'native');
const SCANNED_DIR = path.join(ROOT_DIR, 'tests', 'fixtures', 'pdfs', 'scanned');

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

function loadCases(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.ground_truth.json'))
    .map((name) => {
      const truthPath = path.join(dir, name);
      const truth = JSON.parse(fs.readFileSync(truthPath, 'utf8'));
      return {
        name,
        truth,
        pdfPath: path.join(dir, truth.file_name),
      };
    });
}

beforeAll(async () => {
  if (!fs.existsSync(NATIVE_DIR) || loadCases(NATIVE_DIR).length < 50) {
    await generateDataset();
  }
}, 60000);

describe('pdfTextExtractor synthetic native dataset', () => {
  test('extracts native PDFs with at least 90 percent token overlap', async () => {
    const cases = loadCases(NATIVE_DIR);
    expect(cases).toHaveLength(50);

    const failures = [];

    for (const testCase of cases) {
      const result = await extractDocumentText({
        file_path: testCase.pdfPath,
        document_type: 'pdf',
      });
      const overlap = tokenOverlap(result.text, testCase.truth);

      if (result.method !== 'pdfjs' || overlap < 0.9) {
        failures.push({
          file: testCase.truth.file_name,
          method: result.method,
          overlap: Number((overlap * 100).toFixed(2)),
        });
      }
    }

    expect(failures).toEqual([]);
  }, 120000);
});

describe('pdfTextExtractor synthetic scanned dataset', () => {
  test('extracts scanned PDFs with at least 70 percent token overlap when fixtures exist', async () => {
    const cases = loadCases(SCANNED_DIR);

    if (!cases.length) {
      console.warn('Skipping scanned PDF assertions. Run npm run generate:dataset:ocr to create OCR fixtures.');
      return;
    }

    const failures = [];

    for (const testCase of cases) {
      const result = await extractDocumentText({
        file_path: testCase.pdfPath,
        document_type: 'pdf',
      });
      const overlap = tokenOverlap(result.text, testCase.truth);

      if (result.method !== 'ocr' || overlap < 0.7) {
        failures.push({
          file: testCase.truth.file_name,
          method: result.method,
          overlap: Number((overlap * 100).toFixed(2)),
        });
      }
    }

    expect(failures).toEqual([]);
  }, 300000);
});

module.exports = {
  tokenOverlap,
};
