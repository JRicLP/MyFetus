const { extractDocumentText } = require('../services/pdfTextExtractor');

async function extractPdfText(filePath) {
  return extractDocumentText({
    file_path: filePath,
    document_type: 'pdf',
  });
}

module.exports = {
  extractPdfText,
};
