CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  actor_id INTEGER,
  actor_role VARCHAR(20),
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(50),
  resource_id VARCHAR(50),
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  outcome VARCHAR(10) NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE')),
  detail JSONB
);

CREATE OR REPLACE RULE audit_logs_no_update AS
  ON UPDATE TO audit_logs DO INSTEAD NOTHING;

CREATE OR REPLACE RULE audit_logs_no_delete AS
  ON DELETE TO audit_logs DO INSTEAD NOTHING;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
  ON audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs (action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs (resource, resource_id);
