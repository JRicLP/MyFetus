const fs = require('fs/promises');
const path = require('path');

const MIN_TEXT_LENGTH_FOR_OCR = Number(process.env.PDF_TEXT_MIN_LENGTH_FOR_OCR || 50);
const OCR_LANGUAGES = process.env.OCR_LANGUAGES || 'por+eng';
const OCR_SCALE = Number(process.env.PDF_OCR_SCALE || 2);

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isPdfDocument(document) {
  const extension = path.extname(document.file_path || document.document_name || '').toLowerCase();
  const documentType = String(document.document_type || '').toLowerCase();

  return extension === '.pdf' || documentType.includes('pdf');
}

async function loadPdfJs() {
  return import('pdfjs-dist/legacy/build/pdf.mjs');
}

async function loadPdf(buffer) {
  const pdfjs = await loadPdfJs();

  return pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    useSystemFonts: true,
  }).promise;
}

async function extractTextWithPdfJs(buffer) {
  const pdf = await loadPdf(buffer);
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => item.str)
      .filter(Boolean)
      .join(' ');

    if (pageText.trim()) {
      pages.push(`--- Página ${pageNumber} ---\n${pageText}`);
    }
  }

  await pdf.destroy();

  return normalizeText(pages.join('\n\n'));
}

async function renderPageToPng(page) {
  let createCanvas;

  try {
    ({ createCanvas } = require('@napi-rs/canvas'));
  } catch (err) {
    throw new Error('Dependência @napi-rs/canvas não encontrada para renderizar PDF antes do OCR.');
  }

  const viewport = page.getViewport({ scale: OCR_SCALE });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext('2d');

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas.toBuffer('image/png');
}

async function extractTextWithOcr(buffer) {
  let Tesseract;

  try {
    Tesseract = require('tesseract.js');
  } catch (err) {
    throw new Error('Dependência tesseract.js não encontrada para executar OCR.');
  }

  const pdf = await loadPdf(buffer);
  const pages = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const image = await renderPageToPng(page);
      const result = await Tesseract.recognize(image, OCR_LANGUAGES);
      const pageText = normalizeText(result.data?.text);

      if (pageText) {
        pages.push(`--- Página ${pageNumber} ---\n${pageText}`);
      }

      if (typeof result.data?.confidence === 'number') {
        pages.confidences = [...(pages.confidences || []), result.data.confidence];
      }
    }
  } finally {
    await pdf.destroy();
  }

  const confidences = pages.confidences || [];
  const confidence = confidences.length
    ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    : null;

  return {
    text: normalizeText(pages.join('\n\n')),
    confidence,
  };
}

async function extractDocumentText(document, options = {}) {
  const buffer = options.buffer || await fs.readFile(document.file_path);

  if (!isPdfDocument(document)) {
    return {
      text: normalizeText(buffer.toString('utf8')),
      method: 'plain-text',
      confidence: null,
    };
  }

  const pdfText = await extractTextWithPdfJs(buffer);

  if (pdfText.length >= MIN_TEXT_LENGTH_FOR_OCR || process.env.ENABLE_DOCUMENT_OCR === 'false') {
    return {
      text: pdfText,
      method: 'pdfjs',
      confidence: null,
    };
  }

  const ocrResult = await extractTextWithOcr(buffer);

  return {
    text: ocrResult.text,
    method: 'ocr',
    confidence: ocrResult.confidence,
  };
}

module.exports = {
  extractDocumentText,
  extractTextWithPdfJs,
  extractTextWithOcr,
  isPdfDocument,
  normalizeText,
};
