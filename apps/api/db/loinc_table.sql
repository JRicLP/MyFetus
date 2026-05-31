-- Tabela para armazenar o catálogo LOINC completo
CREATE TABLE IF NOT EXISTS loinc_codes (
  id SERIAL PRIMARY KEY,
  loinc VARCHAR(10) UNIQUE NOT NULL,
  canonical_term VARCHAR(255) NOT NULL,
  aliases TEXT, -- JSON array stringificado: ["alias1", "alias2"]
  category VARCHAR(100),
  specimen VARCHAR(100),
  unit VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_loinc_code ON loinc_codes(loinc);
CREATE INDEX IF NOT EXISTS idx_canonical_term ON loinc_codes(canonical_term);
CREATE INDEX IF NOT EXISTS idx_category ON loinc_codes(category);
