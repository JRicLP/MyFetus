## Modelagem do Banco de Dados — MyFetus

O banco de dados MyFetus foi projetado para armazenar e gerenciar informações sobre usuários, gestantes, gestações, eventos gestacionais, documentos e medidas fetais.
A modelagem privilegia integridade referencial, rastreamento temporal e expansibilidade do sistema.

### Tabela `users`

Armazena os dados básicos dos usuários do sistema.

Estrutura da Tabela:
  * id: Identificador único do usuário (chave primária).
  * name: Nome completo (até 100 caracteres, obrigatório).
  * email: Endereço de e-mail (único e obrigatório).
  * password: Senha criptografada (obrigatória).
  * birthdate: Data de nascimento (obrigatória).
  * is_active: Indica se o usuário está ativo (booleano, padrão: TRUE).
  * role: Define o papel do usuário (`user` ou `admin`, padrão: `user`).
  * created_at: Data/hora de criação (automática).
  * updated_at: Data/hora da última atualização (automática via trigger).

Trigger de Atualização:
  * A função `update_updated_at_column()` e a trigger `update_user_updated_at` garantem que o campo `updated_at` seja atualizado automaticamente em cada modificação de registro.

### Tabela `pregnants`

Armazena os dados cadastrais e clínicos das gestantes, incluindo antecedentes, condições da gestação atual e vacinação.

Principais Campos:
  * user_id: Referência ao usuário (chave estrangeira para `users`).
  * altura, peso_pre_gestacional, peso_atual: Dados antropométricos.
  * antecedentes_* e gestacao_*: Campos booleanos e numéricos que registram histórico obstétrico e condições clínicas.
  * vacinas_*: Campos de controle de imunizações (datas e doses).
  * created_at: Data/hora de criação (automática).

Relacionamentos:
  * Cada gestante pertence a um usuário (`user_id`).
  * Exclusão em cascata garante que, ao remover um usuário, as gestantes associadas também sejam excluídas.

### Tabela `pregnancies`

Registra informações sobre cada gestação, como datas, semanas e medições biométricas.

Principais Campos:
  * pregnant_id: Referência à gestante (FK → `pregnants`).
  * weeks, dum, dpp: Dados cronológicos da gestação.
  * ccn, dgm, glicemia: Medidas clínicas.
  * regularidade_do_ciclo, ig_ultrassonografia: Indicadores e datas adicionais.
  * created_at: Data/hora de criação (automática).

### Tabela `pregnancy_events`

Registra eventos relevantes ocorridos durante a gestação (exames, intercorrências, etc.).

Principais Campos:
  * pregnancy_id: Referência à gestação (FK → `pregnancies`).
  * descricao: Texto descritivo do evento.
  * data_evento: Data em que ocorreu.
  * created_at: Data/hora de registro (automática).

### Tabela `pregnant_documents`

Armazena informações sobre documentos enviados pela gestante.

Principais Campos:
  * pregnant_id: Referência à gestante (FK → `pregnants`).
  * document_name: Nome do arquivo.
  * document_type: Tipo do documento.
  * file_path: Caminho do arquivo armazenado.
  * uploaded_at: Data/hora de upload.
  * updated_at: Atualizado automaticamente via trigger (se aplicável).

### Tabela `medidas_fetais`

Tabela de referência com medidas esperadas para o feto conforme a idade gestacional.

Principais Campos:
  * ccn, crl, dgn: Medidas fetais (em milímetros).
  * idade_gestacional_semanas: Semana correspondente.
  * id: Identificador único.

### Função e Trigger (`triggers.sql`)

Função:
  * `update_updated_at_column()`:
    * Atualiza automaticamente o campo `updated_at` para o timestamp atual sempre que um registro é modificado.

Trigger:
  * `update_user_updated_at`
    * Vinculada à tabela `users`, executa a função acima antes de cada atualização.

### Arquivos Relacionados

  * `create_tables.sql` → Criação de todas as tabelas do banco.
  * `triggers.sql` → Funções e triggers associadas.

### Acesso ao Banco via Docker

Entrar no Banco de Dados no docker:
```bash
docker exec -it myfetus-db psql -U myuser -d mydatabase
```