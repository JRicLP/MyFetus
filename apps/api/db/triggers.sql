/*
  Definição:
    Cria uma função e gatilhos (triggers) para a atualização automática do campo "updated_at"
    sempre que ocorrer uma modificação (UPDATE) nas tabelas do sistema.

  Componentes:
    - Função: update_updated_at_column()
        Define que, ao atualizar um registro, o campo "updated_at" receberá a data e hora atuais (com fuso horário).

    - Triggers:
        - update_users_updated_at: Para a tabela "users".
        - update_pregnants_updated_at: Para a tabela "pregnants".
        - update_pregnancies_updated_at: Para a tabela "pregnancies".
        - update_pregnancy_events_updated_at: Para a tabela "pregnancy_events".
        - update_documents_updated_at: Para a tabela "documents".
        - update_fetal_measurements_updated_at: Para a tabela "fetal_measurements".

  Retorno:
    - Nenhum retorno direto. Atualiza o campo "updated_at" automaticamente durante operações de UPDATE.
*/
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para a tabela 'users'
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Trigger para a tabela 'pregnants'
CREATE TRIGGER update_pregnants_updated_at
BEFORE UPDATE ON pregnants
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Trigger para a tabela 'pregnancies'
CREATE TRIGGER update_pregnancies_updated_at
BEFORE UPDATE ON pregnancies
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Trigger para a tabela 'pregnancy_events'
CREATE TRIGGER update_pregnancy_events_updated_at
BEFORE UPDATE ON pregnancy_events
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Trigger para a tabela 'documents'
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Trigger para a tabela 'fetal_measurements'
CREATE TRIGGER update_fetal_measurements_updated_at
BEFORE UPDATE ON fetal_measurements
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();