# Consentimento LGPD no cadastro (E7-01.1)

Issue: #143 (subtask da #56). Decisões da gestão registradas em 19/10/2026.
**Os textos dos documentos são rascunhos para revisão** e a issue só fecha após a aprovação deles
e das pendências listadas abaixo.

## Documentos (rascunho para revisão)

| Documento | Arquivo | Versão |
|---|---|---|
| Termos de Uso — gestante | [`apps/api/legal/termos-de-uso-gestante.md`](../../apps/api/legal/termos-de-uso-gestante.md) | 0.1-rascunho (19/10/2026) |
| Termos de Uso — profissional de saúde | [`apps/api/legal/termos-de-uso-medico.md`](../../apps/api/legal/termos-de-uso-medico.md) | 0.1-rascunho (19/10/2026) |
| Política de Privacidade | [`apps/api/legal/politica-de-privacidade.md`](../../apps/api/legal/politica-de-privacidade.md) | 0.1-rascunho (19/10/2026) |

A API lê esses arquivos e os serve em `GET /api/consents/policy`; o app exibe exatamente o mesmo texto.
A política cobre uso acadêmico, dados tratados, finalidades, serviços externos (Google Cloud, Google
Gemini, Pinecone, Expo), proteção, retenção e direitos do titular.

## Finalidades (decisão 2: aceites separados)

| Finalidade | Tipo | Perfis | Obrigatória | Decisões possíveis |
|---|---|---|---|---|
| `termos_de_uso_gestante` | Aceite dos Termos | gestante | Sim | aceitar, recusar |
| `termos_de_uso_medico` | Aceite dos Termos | médico | Sim | aceitar, recusar |
| `politica_de_privacidade` | **Ciência** (não é consentimento) | gestante, médico | Sim | declarar ciência |
| `tratamento_dados_saude` | Consentimento **destacado** | gestante | Sim | aceitar, recusar, revogar |
| `uso_ia` | Consentimento opcional | gestante | Não | aceitar, recusar, revogar |
| `pesquisa_usabilidade` | Consentimento opcional | gestante, médico | Não | aceitar, recusar, revogar |

Configuração em `apps/api/config/consentPolicy.js`. Mudar a `version` de uma finalidade exige novo aceite dela.

## O que está implementado

- **Cadastro da gestante e do médico** (`POST /api/users`, `POST /api/doctors`) exigem as finalidades
  obrigatórias do perfil, na versão vigente (`400 CONSENT_REQUIRED` / `409 CONSENT_VERSION_OUTDATED`).
  As opcionais podem ser autorizadas no cadastro, mas não são exigidas. Conta e aceites são gravados
  na mesma transação.
- **Médicos** aceitam os próprios termos (decisão 3) e não podem decidir finalidades da gestante: o aceite
  do médico não substitui a autorização dela.
- **Registro auditável:** tabela `consents` (`user_id`, `purpose`, `version`, `decision`, `ip_address`,
  `user_agent`, `created_at`) e eventos `CONSENT_ACCEPTED/REFUSED/REVOKED` na auditoria.
- **Revogação** acrescenta um registro e não altera o anterior; o estado vigente é o registro mais recente.
- **Nova versão:** o login devolve `consent: { required, pending }` com o que precisa de novo aceite.
- **Retenção (decisão 5):** os registros, inclusive o IP, ficam **protegidos contra alteração** durante o
  período de retenção (trigger no banco bloqueia `UPDATE`/`DELETE`). Ao final, a rotina
  `npm run consents:retention` **anonimiza** (remove IP e user agent) ou **elimina** os registros vencidos.
  O prazo é configurável em `CONSENT_RETENTION_DAYS`; **sem prazo definido, nada é alterado.**
- **App:** cadastro da gestante e do médico com a lista de aceites do perfil, textos para leitura,
  consentimento de dados de saúde destacado e autorizações opcionais desmarcadas por padrão.

## Endpoints

| Método | Rota | Acesso | Uso |
|---|---|---|---|
| `GET` | `/api/consents/policy?role=gestante\|medico` | Público | Finalidades, tipos, versões e textos. |
| `GET` | `/api/consents/me` | JWT | Status do usuário nas finalidades do seu perfil. |
| `POST` | `/api/consents` | JWT | `{ purpose, decision, version }` do próprio usuário. |

O titular é sempre o usuário do token (sem risco de IDOR). Contrato completo em `/docs`.

## Pendências (próxima sprint / decisão da gestão)

| Item | Situação |
|---|---|
| Revisão e aprovação dos três documentos | Rascunhos `0.1-rascunho` enviados para conferência. |
| Prazo de retenção dos registros (inclusive IP) | **Pendente de revisão institucional.** Configurável em `CONSENT_RETENTION_DAYS`. |
| Base legal por finalidade | Pendente (orientação jurídica). |
| Bloqueio por funcionalidade na API (decisão 4) | **Não implementado.** Proposta de mapeamento para aprovação: sem `tratamento_dados_saude` → bloquear leitura/escrita de dados clínicos da própria gestante; sem `uso_ia` → bloquear `/api/internal/rag/chat` e `/chat/agents` para a gestante; documentos, política e canais de direitos sempre acessíveis. |
| Telas de novo aceite e de revogação no app | Não implementadas (dependem do item acima). A API já suporta. |
| Administradores precisam aceitar termos? | Pendente. |
| Canal para exercício de direitos | Pendente (citado como "em definição" na política). |

## Lacuna identificada durante a redação da política

A análise do agente materno (`POST /api/agent/maternal-analysis`, uso do médico) envia o prontuário
descriptografado ao Google Gemini **sem** a remoção de identificadores aplicada no chat multiagente
(`removePatientIdentifiers` em `ragController.js`). A política em rascunho não afirma essa remoção para
o agente; recomenda-se abrir uma issue para aplicar a mesma remoção antes do envio.
