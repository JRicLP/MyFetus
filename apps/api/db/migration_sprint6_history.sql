-- SPRINT 6 - Historico de biometria fetal e peso materno

CREATE TABLE IF NOT EXISTS fetal_biometry_history (
  id SERIAL PRIMARY KEY,
  pregnancy_id INTEGER NOT NULL REFERENCES pregnancies(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  gestational_age_weeks NUMERIC(4, 1) NOT NULL,
  dbp_mm NUMERIC(6, 2) NOT NULL,
  cc_mm NUMERIC(6, 2) NOT NULL,
  ca_mm NUMERIC(6, 2) NOT NULL,
  cf_mm NUMERIC(6, 2) NOT NULL,
  estimated_weight_grams INTEGER NOT NULL,
  expected_median_weight_grams INTEGER NOT NULL,
  percentile NUMERIC(5, 2) NOT NULL,
  z_score NUMERIC(7, 3) NOT NULL,
  notes TEXT,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT fetal_biometry_gestational_age_check
    CHECK (gestational_age_weeks BETWEEN 10 AND 42),
  CONSTRAINT fetal_biometry_measurements_check
    CHECK (dbp_mm > 0 AND cc_mm > 0 AND ca_mm > 0 AND cf_mm > 0),
  CONSTRAINT fetal_biometry_percentile_check
    CHECK (percentile BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_fetal_biometry_pregnancy_date
  ON fetal_biometry_history (pregnancy_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS maternal_weight_history (
  id SERIAL PRIMARY KEY,
  pregnancy_id INTEGER NOT NULL REFERENCES pregnancies(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(6, 2) NOT NULL,
  notes TEXT,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT maternal_weight_positive_check CHECK (weight_kg > 0)
);

CREATE INDEX IF NOT EXISTS idx_maternal_weight_pregnancy_date
  ON maternal_weight_history (pregnancy_id, measured_at DESC);

DROP TRIGGER IF EXISTS update_fetal_biometry_history_updated_at
  ON fetal_biometry_history;
CREATE TRIGGER update_fetal_biometry_history_updated_at
  BEFORE UPDATE ON fetal_biometry_history
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_and_version();

DROP TRIGGER IF EXISTS update_maternal_weight_history_updated_at
  ON maternal_weight_history;
CREATE TRIGGER update_maternal_weight_history_updated_at
  BEFORE UPDATE ON maternal_weight_history
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_and_version();
