# Direitos do titular: exportação e exclusão dos dados (E7-02)

Issue: #145 (subtask da #69). Decisões do P.O. (Dr. Rui) registradas em 23/10/2026 no comentário da #69.
Prazo do marco: M2 (19/11/2026).

Etapas entregues:
- exportação em JSON pela API (#210);
- tela "Meus dados" no app (#212);
- exclusão/anonimização da conta, na API e na mesma tela.

## Decisões do P.O.

| # | Decisão | Resposta |
|---|---|---|
| 1 | Dados na exportação | Aprovado: só os dados do próprio titular, sem segredos, dados de terceiros e registros internos de segurança. |
| 2 | Formato | Aprovado: JSON agora; PDF legível só se sobrar tempo. |
| 3 | Identidade | Aprovado: usuário autenticado e confirmação da senha antes de exportar ou excluir. |
| 4 | Exclusão ou anonimização | Aprovado: excluir dados pessoais e anonimizar o que precisa ficar por retenção ou auditoria. |
| 5 | Prazo e responsável | Ajustado: até 7 dias; responsável é o Dr. Rui. |
| 6 | Escopo por perfil | Aprovado: gestante exporta os seus dados; médico, os do próprio perfil (não os dos pacientes); administrador, só por procedimento operacional. |

## Endpoint

`POST /api/privacy/export` com `{ "password": "<senha atual>" }` e `Authorization: Bearer <JWT>`.

- O titular é sempre o usuário do token. Não existe ID no corpo nem na URL; um `user_id` enviado é ignorado.
- Senha ausente: `400 PASSWORD_REQUIRED`. Senha incorreta, conta inativa ou usuário inexistente:
  a mesma resposta `403 INVALID_PASSWORD`, para não revelar o estado da conta. É 403, e não 401, porque
  o app trata qualquer 401 como sessão expirada e desloga; token ausente ou inválido continua 401.
- Resposta `200` em JSON, como anexo (`myfetus-meus-dados-AAAA-MM-DD.json`) e com `Cache-Control: no-store`.
- Limite próprio: 5 pedidos a cada 15 minutos (`DATA_EXPORT_RATE_LIMIT_MAX`).
- Fica fora do bloqueio por consentimento (`middlewares/consent.js`): quem revogou o consentimento
  continua podendo exercer o direito de acesso.
- A leitura é feita numa transação `REPEATABLE READ READ ONLY`, para as seções serem coerentes entre si.

## O que entra, por perfil

| Seção | Gestante | Médico | Admin | Origem |
|---|---|---|---|---|
| `titular` (nome, e-mail, nascimento, papel, datas) | Sim | Sim | Sim | `users` |
| `consentimentos` (finalidade, versão, decisão, data) | Sim | Sim | Sim | `consents` |
| `prontuario` | Sim | | | `pregnants` |
| `gestacoes`, `eventos` | Sim | | | `pregnancies`, `pregnancy_events` |
| `biometria_fetal`, `peso_materno` (sem os apagados logicamente) | Sim | | | históricos da sprint 6 |
| `pedidos_de_exame` | Sim | | | `exam_requests` |
| `documentos` (metadados, laudo e texto extraído) | Sim | | | `pregnant_documents` |
| `vinculos_medicos` (status e datas) | Sim | | | `doctor_patient_links` |
| `perfil_profissional` (CRM, UF, especialidade, telefone) | | Sim | | `doctors` |

As colunas de cada tabela são uma lista explícita em `apps/api/services/dataExportService.js`.
Coluna nova no banco **não** entra na exportação até ser adicionada lá.

## O que fica de fora, e por quê

| Fica de fora | Motivo |
|---|---|
| `password`, `email_lookup_hash` | Segredos (hash bcrypt e HMAC de busca). |
| `encryption_key_version`, `file_encryption_version`, `file_path` | Detalhes internos de segurança e armazenamento. |
| `doctor_id`, `created_by_user_id`, `reviewed_by_user_id` e dados do médico vinculado | Dados de terceiros. |
| `ip_address` e `user_agent` dos consentimentos, `audit_logs` | Registros internos de segurança. |
| Arquivos originais dos exames | O JSON traz metadados e o texto extraído; o download dos arquivos pode entrar depois. |
| `medidas_fetais` | Tabela sem vínculo com usuário (não é dado do titular). |
| Vetores no Pinecone | Guardam só trechos das diretrizes oficiais (resposta 6 da DPIA), sem dado do titular. |

## Auditoria

Cada pedido gera `DATA_EXPORT` em `audit_logs`:

- sucesso: `detail` só com o formato e a contagem de itens por seção, sem conteúdo pessoal;
- falha: `detail.reason` com `invalid_password`, `user_not_found` ou `internal_error`;
- excesso de pedidos: `DATA_EXPORT_BLOCKED`.

## Testes

`apps/api/tests/dataExport.test.js` (no `npm run test:ci`) usa a cifragem AES real com chave de teste e um
banco falso com duas gestantes e uma médica. Cobre: dados decifrados, usuário A sem dados de B, nenhum
segredo/ciphertext/caminho/ID de terceiro, médico sem dados de pacientes, ID no corpo ignorado, senha
ausente e incorreta, conta inativa, sem token, auditoria só com contagens, snapshot somente leitura,
erro 500 genérico e isenção do bloqueio por consentimento.

## Exclusão da conta

`POST /api/privacy/delete` com `{ "password": "<senha atual>", "confirmation": "EXCLUIR" }` e
`Authorization: Bearer <JWT>`. No app, fica no cartão "Excluir minha conta" da tela "Meus dados".

- O titular é sempre o usuário do token, como na exportação. A rota também fica fora do bloqueio por
  consentimento e tem limite próprio: 5 pedidos a cada 15 minutos (`ACCOUNT_DELETION_RATE_LIMIT_MAX`).
- Senha ausente: `400 PASSWORD_REQUIRED`. Confirmação diferente de `EXCLUIR`: `400 CONFIRMATION_REQUIRED`.
  Senha incorreta, conta inativa ou inexistente: `403 INVALID_PASSWORD`, sem tocar no banco.
- A operação roda numa transação, com a linha do usuário travada (`FOR UPDATE`).

| Perfil | O que acontece |
|---|---|
| Gestante | A linha de `users` é apagada, e o banco remove em cascata o prontuário, as gestações, os eventos, os históricos, os pedidos de exame, os documentos e os vínculos. Os arquivos `.mfe` dos exames são renomeados antes do `DELETE` e apagados depois do `COMMIT`. Se a transação falhar, voltam para o lugar. Isso fecha o R13 da DPIA para a exclusão pelo titular. |
| Médico | A conta é **anonimizada**, não apagada: nome "Conta excluída", e-mail `conta-excluida-<id>@removido.invalid`, nascimento `1900-01-01`, senha aleatória descartada, `email_lookup_hash` nulo e `is_active = false`. No perfil profissional, o CRM vira "removido", a UF vira "XX", e telefone e especialidade ficam nulos. Os vínculos com pacientes são apagados, então o acesso às pacientes acaba na hora, mesmo com o token ainda válido. Pedidos de exame e laudos continuam no prontuário das pacientes (`exam_requests.doctor_id` é `RESTRICT`). |
| Admin | `403 ACCOUNT_DELETION_NOT_SELF_SERVICE`. A exclusão é feita por procedimento operacional (decisão 6). |

**Interpretação a confirmar com o P.O.:** anonimizar o médico, em vez de apagar, segue a decisão 4
("anonimizar o que precisa ficar"), porque os pedidos e laudos dele fazem parte do prontuário das pacientes.

**O que fica guardado:**
- consentimentos e `audit_logs`, até o fim do projeto (resposta 4 da DPIA). As duas tabelas não têm chave
  estrangeira para `users`, e o banco protege os dois contra exclusão;
- backups, até expirarem (resposta 5 da DPIA). O app avisa isso no cartão de exclusão.

**No aparelho:** depois da exclusão, o app apaga as chaves locais do usuário (`clearScopedItems`), encerra a
sessão e volta para o login.

**Auditoria:** cada pedido gera `ACCOUNT_DELETED`. No sucesso, o `detail` traz o papel, o modo (`deleted` ou
`anonymized`), as contagens e quantos arquivos foram removidos ou falharam. Na falha, traz o motivo
(`invalid_password`, `ACCOUNT_DELETION_NOT_SELF_SERVICE` ou `internal_error`). O excesso de pedidos gera
`ACCOUNT_DELETION_BLOCKED`.

**Testes:**
- `apps/api/tests/accountDeletion.test.js` (no `test:ci`) usa a cifragem real e arquivos de verdade numa
  pasta temporária. Cobre:
  - gestante apagada em cascata, com o arquivo removido;
  - usuária A sem tocar em B;
  - consentimentos mantidos;
  - médico anonimizado, sem vínculos e com as pacientes intactas;
  - admin bloqueado;
  - senha errada e confirmação ausente ou em minúsculas;
  - rollback que devolve o arquivo ao lugar;
  - token reutilizado após a exclusão;
  - auditoria sem dado pessoal;
  - isenção do consentimento.
- `apps/mobile/tests/accountDeletion.test.ts` cobre as regras puras do cartão.
- Validado também no Postgres local e no Expo Web com as contas do seed:
  - gestante com exame enviado: linhas e arquivo removidos, consentimentos mantidos;
  - médica com pedido de exame: anonimizada, sem vínculos e com o pedido mantido.

## Próximas etapas

1. **Prazo operacional:** registrar no fluxo de atendimento o prazo de até 7 dias com o Dr. Rui como responsável.
2. **PDF da exportação:** só se sobrar tempo (decisão 2).
3. **Fora do escopo:** o `DELETE /api/users/:id` do admin continua sem remover arquivos nem auditar. O R13
   segue aberto para esse caminho.
