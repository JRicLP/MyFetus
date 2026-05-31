-- MIGRATION - Extração de texto de documentos PDF
-- Adiciona campos usados pelo worker PDF.js/OCR.

ALTER TABLE pregnant_documents
  ADD COLUMN IF NOT EXISTS extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS extraction_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS extraction_method VARCHAR(20),
  ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS extraction_error TEXT,
  ADD COLUMN IF NOT EXISTS extraction_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMP;

ALTER TABLE pregnant_documents
  DROP CONSTRAINT IF EXISTS pregnant_documents_extraction_status_check;

ALTER TABLE pregnant_documents
  ADD CONSTRAINT pregnant_documents_extraction_status_check
  CHECK (extraction_status IN ('pending', 'processing', 'done', 'failed'));

CREATE INDEX IF NOT EXISTS idx_pregnant_documents_extraction_status
  ON pregnant_documents (extraction_status);
