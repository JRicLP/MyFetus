-- Executado por ultimo no primeiro boot, apenas apos todas as migrations SQL.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (version) VALUES
  ('01_create_tables.sql'),
  ('02_triggers.sql'),
  ('03_migration.sql'),
  ('04_migration_sprint6_history.sql'),
  ('05_doctor_patient_links.sql'),
  ('06_extracted_text.sql'),
  ('07_security_baseline.sql'),
  ('08_aes_encryption.sql'),
  ('09_document_security.sql'),
  ('10_audit_trail.sql'),
  ('11_normalize_update_triggers.sql')
ON CONFLICT DO NOTHING;
