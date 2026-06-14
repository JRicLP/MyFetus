-- Security baseline for databases created before the security sprint.

CREATE TABLE IF NOT EXISTS doctor_patient_links (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pregnant_id INTEGER NOT NULL REFERENCES pregnants(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT doctor_patient_unique UNIQUE (doctor_id, pregnant_id),
  CONSTRAINT doctor_patient_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_updated_at ON users;
CREATE TRIGGER update_user_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pregnants_updated_at ON pregnants;
CREATE TRIGGER trg_pregnants_updated_at
BEFORE UPDATE ON pregnants
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pregnancies_updated_at ON pregnancies;
CREATE TRIGGER trg_pregnancies_updated_at
BEFORE UPDATE ON pregnancies
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pregnancy_events_updated_at ON pregnancy_events;
CREATE TRIGGER trg_pregnancy_events_updated_at
BEFORE UPDATE ON pregnancy_events
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pregnant_documents_updated_at ON pregnant_documents;
CREATE TRIGGER trg_pregnant_documents_updated_at
BEFORE UPDATE ON pregnant_documents
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
