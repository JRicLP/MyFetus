-- MIGRATION SPRINT 1 - MyFetus

-- O que faz:
--   1. Ajusta o campo role da tabela users para aceitar 'gestante' e 'medico'
--   2. Adiciona updated_at nas tabelas que não tinham
--   3. Cria triggers de updated_at para essas tabelas
--   4. Cria a tabela doctors para o perfil médico

-- 1. Ajuste do campo role em users
--    Antes: aceita apenas 'user' e 'admin'
--    Depois: aceita 'gestante', 'medico' e 'admin'

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('gestante', 'medico', 'admin'));

ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'gestante';

-- 2. Adiciona updated_at nas tabelas que faltavam
--    (pregnancies, pregnancy_events, pregnant_documents, medidas_fetais)
--    Necessário para que o motor de sync saiba o que mudou

ALTER TABLE pregnancies
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE pregnancy_events
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE pregnant_documents
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE medidas_fetais
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. Triggers de updated_at para as novas tabelas
--    Segue o mesmo padrão já usado em users (triggers.sql)
--    A função update_updated_at_column() já existe no banco,
--    só criamos os triggers novos.

DROP TRIGGER IF EXISTS update_pregnancies_updated_at ON pregnancies;
CREATE TRIGGER update_pregnancies_updated_at
  BEFORE UPDATE ON pregnancies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pregnancy_events_updated_at ON pregnancy_events;
CREATE TRIGGER update_pregnancy_events_updated_at
  BEFORE UPDATE ON pregnancy_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pregnant_documents_updated_at ON pregnant_documents;
CREATE TRIGGER update_pregnant_documents_updated_at
  BEFORE UPDATE ON pregnant_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_medidas_fetais_updated_at ON medidas_fetais;
CREATE TRIGGER update_medidas_fetais_updated_at
  BEFORE UPDATE ON medidas_fetais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Tabela doctors
--    Perfil do médico, equivalente à tabela pregnants
--    para a gestante. Vinculada a users pelo user_id.

CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

  crm VARCHAR(20) NOT NULL,
  crm_estado VARCHAR(2) NOT NULL,
  especialidade VARCHAR(100),
  telefone VARCHAR(20),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_doctors_updated_at ON doctors;
CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- MIGRATION SPRINT 3 - LOINC Mapping

-- O que faz:
--   1. Cria a tabela loinc_codes para armazenar o catálogo LOINC
--   2. Adiciona índices para buscas por código, termo canônico e categoria
--   3. Permite carregar dados do banco em vez de hardcodificar no código

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

-- Índices para buscas rápidas no mapper
CREATE INDEX IF NOT EXISTS idx_loinc_code ON loinc_codes(loinc);
CREATE INDEX IF NOT EXISTS idx_canonical_term ON loinc_codes(canonical_term);
CREATE INDEX IF NOT EXISTS idx_category ON loinc_codes(category);

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_loinc_codes_updated_at ON loinc_codes;
CREATE TRIGGER update_loinc_codes_updated_at
  BEFORE UPDATE ON loinc_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();