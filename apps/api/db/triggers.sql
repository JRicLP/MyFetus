/*
  Definicao:
    Cria uma funcao e triggers para atualizar "updated_at" e incrementar "version"
    sempre que ocorrer um UPDATE nas tabelas principais do sistema.

  Tabelas:
    - users
    - pregnants
    - pregnancies
    - pregnancy_events
    - pregnant_documents
*/
CREATE OR REPLACE FUNCTION update_updated_at_and_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  IF TG_OP = 'UPDATE' THEN
    NEW.version = COALESCE(NEW.version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_updated_at ON users;
CREATE TRIGGER update_user_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_pregnants_updated_at ON pregnants;
CREATE TRIGGER trg_pregnants_updated_at
BEFORE UPDATE ON pregnants
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_pregnancies_updated_at ON pregnancies;
CREATE TRIGGER trg_pregnancies_updated_at
BEFORE UPDATE ON pregnancies
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_pregnancy_events_updated_at ON pregnancy_events;
CREATE TRIGGER trg_pregnancy_events_updated_at
BEFORE UPDATE ON pregnancy_events
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_pregnant_documents_updated_at ON pregnant_documents;
CREATE TRIGGER trg_pregnant_documents_updated_at
BEFORE UPDATE ON pregnant_documents
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_and_version();