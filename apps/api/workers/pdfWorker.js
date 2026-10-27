const {
  processPendingDocumentTextExtractions,
  startDocumentTextExtractionWorker,
  stopDocumentTextExtractionWorker,
} = require('../services/documentExtractionWorker');

module.exports = {
  processPendingDocumentTextExtractions,
  startDocumentTextExtractionWorker,
  stopDocumentTextExtractionWorker,
};
