-- Migrations antigas criam dois triggers equivalentes em quatro tabelas.
-- Consolida os nomes sem alterar os demais triggers de cada tabela.

DROP TRIGGER IF EXISTS trg_update_pregnant_updated_at ON pregnants;
DROP TRIGGER IF EXISTS trg_pregnants_updated_at ON pregnants;
CREATE TRIGGER trg_pregnants_updated_at
  BEFORE UPDATE ON pregnants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pregnancies_updated_at ON pregnancies;
DROP TRIGGER IF EXISTS trg_pregnancies_updated_at ON pregnancies;
CREATE TRIGGER trg_pregnancies_updated_at
  BEFORE UPDATE ON pregnancies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pregnancy_events_updated_at ON pregnancy_events;
DROP TRIGGER IF EXISTS trg_pregnancy_events_updated_at ON pregnancy_events;
CREATE TRIGGER trg_pregnancy_events_updated_at
  BEFORE UPDATE ON pregnancy_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pregnant_documents_updated_at ON pregnant_documents;
DROP TRIGGER IF EXISTS trg_pregnant_documents_updated_at ON pregnant_documents;
CREATE TRIGGER trg_pregnant_documents_updated_at
  BEFORE UPDATE ON pregnant_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
