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