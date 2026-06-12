-- Completes the document schema and tracks encrypted file versions.

ALTER TABLE pregnant_documents
  ADD COLUMN IF NOT EXISTS extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS extraction_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS extraction_method VARCHAR(20),
  ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS extraction_error TEXT,
  ADD COLUMN IF NOT EXISTS extraction_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS report_comment TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS file_encryption_version INTEGER;

ALTER TABLE pregnant_documents
  ALTER COLUMN document_name TYPE TEXT USING document_name::TEXT,
  ALTER COLUMN document_type TYPE TEXT USING document_type::TEXT,
  ALTER COLUMN extracted_text TYPE TEXT USING extracted_text::TEXT,
  ALTER COLUMN extraction_error TYPE TEXT USING extraction_error::TEXT,
  ALTER COLUMN report_comment TYPE TEXT USING report_comment::TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pregnant_documents_file_encryption_version_positive'
  ) THEN
    ALTER TABLE pregnant_documents
      ADD CONSTRAINT pregnant_documents_file_encryption_version_positive
      CHECK (
        file_encryption_version IS NULL
        OR file_encryption_version > 0
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pregnant_documents_extraction_status
  ON pregnant_documents (extraction_status);

COMMENT ON COLUMN pregnant_documents.file_encryption_version IS
  'AES-GCM key version stored in the encrypted file header; NULL denotes a legacy plaintext file.';
