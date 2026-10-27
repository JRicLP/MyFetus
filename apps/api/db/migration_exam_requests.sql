-- E2-01: solicitacoes de exames feitas por medicos a gestantes.
-- Campos clinicos de texto sao criptografados pelo servico AES da aplicacao.

CREATE TABLE IF NOT EXISTS exam_requests (
  id SERIAL PRIMARY KEY,
  pregnant_id INTEGER NOT NULL REFERENCES pregnants(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  exam_name TEXT NOT NULL,
  instructions TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  encryption_key_version INTEGER,
  CONSTRAINT exam_requests_status_check
    CHECK (status IN ('pending', 'submitted', 'reviewed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_exam_requests_pregnant_status
  ON exam_requests (pregnant_id, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_requests_doctor
  ON exam_requests (doctor_id, requested_at DESC);

DROP TRIGGER IF EXISTS trg_exam_requests_updated_at ON exam_requests;
CREATE TRIGGER trg_exam_requests_updated_at
  BEFORE UPDATE ON exam_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
