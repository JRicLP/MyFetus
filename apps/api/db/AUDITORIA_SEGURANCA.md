# Auditoria de Seguranca e Classificacao de Dados

Esta classificacao e a fonte de verdade para criptografia em repouso. A matriz
executavel correspondente esta em `apps/api/config/dataClassification.js`.

## Regras

- `AES-256-GCM`: dado pessoal ou clinico que deve permanecer confidencial.
- `Hash`: credencial ou valor usado em busca exata.
- `Claro`: chave tecnica, relacionamento, estado operacional ou dado publico.
- Arquivos enviados possuem classificacao propria e serao criptografados em
  disco; `file_path` permanece em claro.

## Classificacao Definitiva

| Tabela | AES-256-GCM | Hash | Mantido em claro |
|---|---|---|---|
| `users` | `name`, `email`, `birthdate` | `password` com bcrypt; futuro `email_lookup_hash` com HMAC-SHA-256 | `id`, `is_active`, `role`, timestamps |
| `doctors` | `crm`, `crm_estado`, `telefone` | - | `id`, `user_id`, `especialidade`, timestamps |
| `pregnants` | Todos os campos biometricos, antecedentes, historico obstetrico, gestacao atual, vacinas e textos `info_gerais_*` | - | `id`, `user_id`, timestamps, versao da chave |
| `pregnancies` | `weeks`, `is_checked`, `dum`, `dpp`, `ccn`, `dgm`, `glicemia`, `frequencia_cardiaca`, `altura_uterina`, `regularidade_do_ciclo`, `ig_ultrassonografia` | - | `id`, `pregnant_id`, timestamps |
| `pregnancy_events` | `descricao`, `data_evento` | - | `id`, `pregnancy_id`, timestamps |
| `pregnant_documents` | `document_name`, `document_type`, `extracted_text`, `extraction_error`, `report_comment` | - | IDs, `file_path`, estados/metodo/confianca/tentativas da extracao, datas operacionais, versao da chave |
| `doctor_patient_links` | - | - | Relacionamento de autorizacao e status |
| `medidas_fetais` | `ccn`, `crl`, `dgn`, `idade_gestacional_semanas` | - | `id`, timestamps |

## Decisoes de Busca e Indice

- AES-GCM usa IV aleatorio, portanto `email` criptografado nao pode ser usado em
  igualdade ou `UNIQUE`.
- A integracao no banco deve adicionar `email_lookup_hash`, calculado com
  HMAC-SHA-256 e chave separada, sobre o email normalizado.
- Campos clinicos criptografados deixam de suportar filtros, ordenacao e
  agregacoes SQL diretas. Consultas atuais devem ser revisadas antes da migration.

## Exclusoes Intencionais

- `password` nunca usa AES; permanece bcrypt.
- IDs, FKs, roles e estados operacionais ficam em claro para integridade,
  autorizacao e processamento de filas.
- `medidas_fetais` recebe medicoes clinicas pela API e deve ser criptografada.
  A falta de FK para `pregnant_id` ou `pregnancy_id` e uma lacuna de modelagem
  que precisa ser corrigida antes de consultas longitudinais.
- `file_path` fica em claro, mas o conteudo apontado por ele sera criptografado.

## Campos Fisicos

Todo campo classificado como AES deve aceitar `TEXT` antes da integracao. A
migration de tipos e de `email_lookup_hash` pertence a etapa seguinte.
