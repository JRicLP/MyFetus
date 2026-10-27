-- E2-02: vincula o arquivo enviado ao pedido de exame.

ALTER TABLE pregnant_documents
  ADD COLUMN IF NOT EXISTS exam_request_id INTEGER
    REFERENCES exam_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pregnant_documents_exam_request
  ON pregnant_documents (exam_request_id);
