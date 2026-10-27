-- E7-01.1: consentimento versionado (LGPD).
--
-- Cada aceite, recusa ou revogação é uma nova linha; o estado atual de um
-- usuário em uma finalidade é o registro mais recente. Revogar não altera o
-- aceite anterior: a trilha fica preservada durante o período de retenção.
--
-- Retenção (decisão da gestão, 19/10/2026): os registros, inclusive o IP, são
-- protegidos contra alteração durante o período de retenção e podem ser
-- anonimizados ou eliminados ao final, ressalvadas hipóteses legais de
-- conservação. O prazo é configurável (CONSENT_RETENTION_DAYS) e ainda está
-- pendente de definição institucional; a eliminação só ocorre pela rotina
-- `npm run consents:retention`, que habilita a operação apenas na própria transação.
--
-- Sem chave estrangeira para users (mesmo padrão de audit_logs): a prova do
-- consentimento não deve impedir a exclusão da conta.
CREATE TABLE IF NOT EXISTS consents (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  version VARCHAR(30) NOT NULL,
  decision VARCHAR(10) NOT NULL CHECK (decision IN ('accepted', 'refused', 'revoked')),
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Versões anteriores deste rascunho usavam regras que ignoravam UPDATE/DELETE.
DROP RULE IF EXISTS consents_no_update ON consents;
DROP RULE IF EXISTS consents_no_delete ON consents;

CREATE OR REPLACE FUNCTION protect_consents_retention() RETURNS trigger AS $$
DECLARE
  retention_days INTEGER;
BEGIN
  IF current_setting('myfetus.consent_retention_job', true) = 'on' THEN
    retention_days := NULLIF(current_setting('myfetus.consent_retention_days', true), '')::INTEGER;
    IF retention_days IS NOT NULL
       AND retention_days > 0
       AND OLD.created_at < CURRENT_TIMESTAMP - make_interval(days => retention_days) THEN
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;
      -- Fora da exclusão, só é permitido anonimizar (remover IP e user agent).
      IF NEW.id = OLD.id AND NEW.user_id = OLD.user_id AND NEW.purpose = OLD.purpose
         AND NEW.version = OLD.version AND NEW.decision = OLD.decision
         AND NEW.created_at = OLD.created_at
         AND NEW.ip_address IS NULL AND NEW.user_agent IS NULL THEN
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  RAISE EXCEPTION 'Registros de consentimento sao protegidos durante o periodo de retencao'
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS consents_protect_retention ON consents;
CREATE TRIGGER consents_protect_retention
  BEFORE UPDATE OR DELETE ON consents
  FOR EACH ROW EXECUTE FUNCTION protect_consents_retention();

CREATE INDEX IF NOT EXISTS idx_consents_user_purpose
  ON consents (user_id, purpose, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_consents_created_at
  ON consents (created_at);
