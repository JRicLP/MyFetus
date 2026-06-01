ALTER TABLE pregnant_documents
  ADD COLUMN IF NOT EXISTS vector_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS vector_indexed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS vector_error TEXT,
  ADD COLUMN IF NOT EXISTS vector_chunk_count INTEGER;

ALTER TABLE pregnant_documents
  DROP CONSTRAINT IF EXISTS pregnant_documents_vector_status_check;

ALTER TABLE pregnant_documents
  ADD CONSTRAINT pregnant_documents_vector_status_check
  CHECK (vector_status IN ('pending', 'processing', 'done', 'failed', 'skipped'));

CREATE INDEX IF NOT EXISTS idx_pregnant_documents_vector_status
  ON pregnant_documents (vector_status);

