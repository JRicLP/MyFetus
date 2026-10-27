-- E7-03: aprovação de médicos antes do acesso clínico.

ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approval_reason TEXT,
  ADD COLUMN IF NOT EXISTS approval_decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS crm_lookup_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE doctors
  DROP CONSTRAINT IF EXISTS doctors_approval_status_check;

ALTER TABLE doctors
  ADD CONSTRAINT doctors_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'revoked'));

ALTER TABLE doctors
  DROP CONSTRAINT IF EXISTS doctors_crm_lookup_hash_format;

ALTER TABLE doctors
  ADD CONSTRAINT doctors_crm_lookup_hash_format
  CHECK (crm_lookup_hash IS NULL OR crm_lookup_hash ~ '^[0-9a-f]{64}$');

CREATE UNIQUE INDEX IF NOT EXISTS doctors_crm_lookup_hash_unique
  ON doctors (crm_lookup_hash)
  WHERE crm_lookup_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_doctors_approval_status
  ON doctors (approval_status);
