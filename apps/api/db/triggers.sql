/*
  Definição:
    Cria uma função e um gatilho (trigger) para atualização automática do campo "updated_at"
    sempre que ocorrer uma modificação (UPDATE) na tabela "users".

  Componentes:
    - Função: update_updated_at_column()
        Define que, ao atualizar um registro, o campo "updated_at" receberá a data e hora atuais.

    - Trigger: update_user_updated_at
        Executa a função acima antes de cada atualização na tabela "users".

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

CREATE TRIGGER update_user_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();