# MyFetus 2.0

Documentação técnica de transição do projeto MyFetus 2.0.

O **MyFetus 2.0** é um sistema acadêmico de saúde digital voltado ao acompanhamento materno-fetal durante o pré-natal. A solução conecta gestantes e profissionais de saúde em uma plataforma integrada, composta por aplicativo mobile, API REST, banco de dados PostgreSQL, processamento de exames, dashboards clínicos, alertas de risco, histórico gestacional e recursos de apoio a decisão clínica com IA.

Este README foi escrito para permitir que uma nova equipe consiga entender, configurar, executar, testar e continuar o desenvolvimento do projeto sem depender de conhecimento prévio da equipe original.

## Sumário

- [Estado do projeto](#estado-do-projeto)
- [Repositórios](#repositórios)
- [Visão geral da solução](#visão-geral-da-solução)
- [Funcionalidades implementadas](#funcionalidades-implementadas)
- [Arquitetura](#arquitetura)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Estrutura do monorepo](#estrutura-do-monorepo)
- [Configuração e execução local](#configuração-e-execução-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados](#banco-de-dados)
- [API](#api)
- [Processamento de documentos](#processamento-de-documentos)
- [RAG e chat clínico](#rag-e-chat-clínico)
- [Segurança e privacidade](#segurança-e-privacidade)
- [Testes](#testes)
- [CI/CD e deploy](#cicd-e-deploy)
- [Scripts úteis](#scripts-úteis)
- [Credenciais de teste](#credenciais-de-teste)
- [Bugs conhecidos](#bugs-conhecidos)
- [Limitações e backlog futuro](#limitações-e-backlog-futuro)
- [Troubleshooting](#troubleshooting)
- [Documentação complementar](#documentação-complementar)

## Estado do projeto

| Item | Situação |
|---|---|
| Tipo de projeto | Monorepo acadêmico |
| Aplicação mobile | Implementada em Expo/React Native |
| Backend | Implementado em Node.js/Express |
| Banco de dados | PostgreSQL via Docker Compose |
| Autenticação | JWT com controle de papéis |
| Perfis principais | Gestante, médico e admin |
| Processamento de documentos | Upload, extração de texto, OCR e consulta |
| RAG/chat clínico | Busca semântica, embeddings, Pinecone e geração com Gemini |
| Deploy de homologação | Cloud Run GCP com HTTPS e CD automatizado |
| Deploy de produção | Não implementado |
| CI/CD | CI em PRs e CD aprovado em `main` |
| Bugs conhecidos | Nenhum bug conhecido identificado na versão entregue |

## Repositórios

| Tipo | Link | Branch principal | Observação |
|---|---|---|---|
| Versão atual | <https://github.com/felipemrvieira/MyFetus.git> | `main` | Repositório principal para continuidade do desenvolvimento. |
| Versão herdada | <https://github.com/Lucasrc22/github-grupo7.git> | `main` | Projeto usado como base histórica antes da evolução para o MyFetus 2.0. |

## Visão geral da solução

O MyFetus 2.0 foi evoluído para apoiar dois fluxos principais:

1. **Fluxo da gestante**: acompanhamento da gestação, visualização semanal do desenvolvimento fetal, checklist de cuidados, controle de hidratação, envio de exames e acesso ao chat clínico.
2. **Fluxo médico**: dashboard de pacientes, prontuário estruturado, histórico clínico, alertas de risco, visualização de gráficos, consulta de exames e suporte a decisão clínica.

A plataforma também inclui uma camada backend responsável por:

- autenticar usuários;
- controlar permissões por papel;
- persistir dados clínicos no PostgreSQL;
- processar documentos laboratoriais;
- proteger dados sensíveis por criptografia e sanitização;
- registrar auditoria;
- oferecer endpoints para RAG, LOINC, agentes clínicos e séries históricas.

## Funcionalidades implementadas

### Gestante

- Cadastro e login.
- Navegação por abas no aplicativo.
- Acompanhamento semana a semana da gestação.
- Cálculo de idade gestacional e data provável do parto.
- Checklist de cuidados.
- Controle diário de hidratação.
- Tela de exames.
- Chat clínico integrado ao backend.
- Visualização de informações gerais da gestação.

### Médico

- Cadastro de médico.
- Login com perfil médico.
- Dashboard de pacientes.
- Vínculo entre médico e gestante.
- Visualização de prontuário da paciente.
- Módulos de identificação, antecedentes familiares, antecedentes clínicos, histórico obstétrico, gestação atual, vacinas, exames e ultrassons.
- Resumo clínico consolidado.
- Tela de alertas de risco.
- Gráficos de crescimento e histórico.

### Backend

- API REST com Express.
- Autenticação JWT.
- Controle de acesso por papéis (`gestante`, `medico`, `admin`).
- Rate limit para login, cadastro e rotas administrativas.
- Cadastro e manutenção de usuários.
- Cadastro de médicos.
- Cadastro e consulta de gestantes.
- Cadastro e consulta de gestações.
- Registro de eventos gestacionais.
- Upload, consulta, download, atualização e exclusão de documentos.
- Extração de texto de PDFs com PDF.js e OCR.
- Worker de processamento assíncrono de documentos.
- Registro de medidas fetais.
- Histórico de biometria fetal e peso materno.
- Cálculo de percentis/gráficos de crescimento.
- Mapeamento de termos clínicos para LOINC.
- Busca semântica e chat clínico via RAG.
- Agentes clínicos para análise materno-fetal.
- Auditoria administrativa.
- Sincronização administrativa.

### Inteligência artificial e apoio clínico

- Busca semântica em base de conhecimento clínica.
- Chunking de documentos.
- Geração de embeddings.
- Integração com Pinecone para armazenamento vetorial.
- Chat clínico com recuperação de contexto.
- Geração de resposta com Gemini.
- Sanitização de dados pessoais antes do processamento por IA.
- Testes de relevância e validação de recuperação.

## Arquitetura

```text
                 Aplicativo mobile Expo/React Native
                       Gestante | Médico
                                |
                                | HTTP/JSON
                                v
                        API Node.js/Express
                                |
          ------------------------------------------------
          |                 |              |             |
    PostgreSQL       Processamento     RAG/IA       Auditoria
  dados clínicos     de documentos    Pinecone      segurança
    e usuários       PDF/OCR/LOINC    Gemini        logs
```

### Responsabilidades por camada

| Camada | Responsabilidade |
|---|---|
| `apps/mobile` | Interface do aplicativo, rotas Expo, telas da gestante, telas médicas, gráficos e integração com API. |
| `apps/api` | API REST, autenticação, regras de negócio, acesso ao banco, processamento de documentos, RAG e segurança. |
| `apps/api/db` | Scripts SQL de criação, migração, triggers, tabelas clínicas, segurança e auditoria. |
| `scripts` | Geração de datasets e relatórios de acurácia. |
| `tests` | Testes automatizados e fixtures de PDF. |

## Tecnologias utilizadas

### Frontend mobile

| Tecnologia | Versão | Finalidade |
|---|---:|---|
| Expo | 56.x | Execução e build do aplicativo mobile. |
| React Native | 0.85.x | Construção da interface mobile. |
| React | 19.x | Biblioteca de componentes. |
| TypeScript | 6.x | Tipagem estática. |
| Expo Router | 56.x | Navegação baseada em arquivos. |
| Async Storage | 2.x | Armazenamento local de sessão/token. |
| Victory Native | 36.x | Gráficos de crescimento e comparação. |

### Backend

| Tecnologia | Versão | Finalidade |
|---|---:|---|
| Node.js | 18+ | Runtime do backend. |
| Express | 5.x | API REST. |
| PostgreSQL | 15-alpine | Banco relacional. |
| JWT | 9.x | Autenticação e sessão. |
| bcrypt | 6.x | Hash de senhas. |
| multer | 2.x | Upload de arquivos. |
| express-rate-limit | 8.x | Limitação de requisições sensíveis. |
| dotenv | 16.x | Configuração por variáveis de ambiente. |

### Documentos, IA e dados clínicos

| Tecnologia | Finalidade |
|---|---|
| PDF.js | Extração de texto de PDFs. |
| Tesseract.js | OCR para documentos escaneados. |
| `@napi-rs/canvas` | Suporte a renderização de páginas PDF. |
| Pinecone | Banco vetorial para RAG. |
| Hugging Face Transformers | Embeddings locais. |
| Google Gemini | Geração de respostas do chat clínico. |
| LOINC | Normalização de termos de exames laboratoriais. |

### Infraestrutura e testes

| Tecnologia | Finalidade |
|---|---|
| Docker | Containerização do banco e backend. |
| Docker Compose | Orquestração local. |
| Jest/Node test runner | Testes automatizados. |
| Turbo | Suporte a monorepo. |

## Estrutura do monorepo

```text
MyFetus/
├── apps/
│   ├── api/
│   │   ├── config/                 # Configurações de segurança e ambiente
│   │   ├── controllers/            # Handlers HTTP e regras dos endpoints
│   │   ├── db/                     # Schema, migrations, triggers e auditoria
│   │   ├── middlewares/            # Autenticação, autorização e rate limit
│   │   ├── routes/                 # Rotas REST
│   │   ├── scripts/                # Scripts de segredo, chaves e migrações
│   │   ├── services/               # Serviços de domínio, IA, documentos e cripto
│   │   ├── tests/                  # Testes do backend
│   │   ├── utils/                  # Logger, sanitização, validadores e helpers
│   │   ├── workers/                # Workers de documentos e RAG
│   │   └── server.js               # Entrada da API
│   └── mobile/
│       ├── app/                    # Rotas e telas Expo Router
│       │   ├── (tabs)/             # Área principal da gestante
│       │   └── doctor/             # Área médica
│       ├── assets/                 # Imagens e ícones
│       ├── components/             # Componentes reutilizáveis
│       ├── hooks/                  # Hooks React
│       └── utils/                  # Utilitários do app
├── reports/                        # Relatórios gerados por scripts
├── scripts/                        # Scripts de dataset/acurácia
├── tests/                          # Testes raiz e fixtures de PDF
├── docker-compose.yml              # PostgreSQL + backend
├── .env.example                    # Modelo de variáveis de ambiente
└── package.json                    # Scripts raiz
```

## Configuração e execução local

### Guia Rápido de Onboarding (≤ 10 minutos)

O projeto dispõe do script automatizado `npm run setup` para preparar todo o ambiente de desenvolvimento local (API, banco de dados e sementes de teste):

1. **Pré-requisitos**:
   - **Node.js**: versão 18 ou superior.
   - **Docker Desktop**: instalado e em execução.

2. **Configuração automática em comando único**:
   Na raiz do repositório, execute:
   ```bash
   npm run setup
   ```
   *O que este comando faz automaticamente:*
   - Valida os pré-requisitos do ambiente (Node.js e Docker daemon).
   - Cria o arquivo `.env` a partir do `.env.example` (se ainda não existir).
   - Gera segredos criptográficos locais seguros (`JWT_SECRET`, `AES_ENCRYPTION_KEY_V1`, `EMAIL_LOOKUP_HMAC_KEY`, `PG_PASSWORD`).
   - Instala as dependências necessárias do monorepo.
   - Inicia o contêiner do PostgreSQL 15 (`docker compose up -d db`).
   - Aguarda a prontidão do banco e aplica automaticamente as migrações pendentes (`scripts/migrate.js`).
   - Executa os seeds iniciais (`scripts/seed.js`).

   Depois do setup, `npm run seed` pode ser executado novamente para completar
   os dados sinteticos sem duplicar registros. A carga cria 1 administrador,
   2 medicos e 10 gestantes, com gestacao, consultas, historico de peso e
   vinculos medico-paciente. Contas ja existentes mantem suas senhas e dados.
   O comando aceita apenas `NODE_ENV=development` ou `test` e PostgreSQL local.
   A senha inicial das novas contas e `SenhaTeste123!`; defina `SEED_PASSWORD`
   para usar outra senha na criacao de novas contas.

3. **Executar as aplicações**:
   ```bash
   # Iniciar API Backend (porta 3000)
   npm run dev:api

   # Iniciar Aplicativo Mobile (Expo)
   npm run dev:mobile
   ```

4. **Atualizar migrações preservando dados existentes**:
   Se você já possui o volume `db_data` criado e deseja aplicar novas tabelas/colunas sem perder seus dados cadastrados:
   ```bash
   npm run db:migrate
   # ou apenas execute npm run setup (que aplica as migrações pendentes automaticamente)
   ```

5. **Resetar o ambiente (opcional)**:
   Para limpar contêineres e recriar o volume do banco de dados do zero:
   ```bash
   npm run setup -- --reset
   ```

---

### Procedimento Manual Passo a Passo

### 1. Pré-requisitos

- Node.js 18 ou superior.
- npm.
- Docker e Docker Compose.
- Expo Go em dispositivo físico ou emulador Android/iOS.
- Git.

### 2. Clonar o repositório

```bash
git clone https://github.com/felipemrvieira/MyFetus.git
cd MyFetus
```

### 3. Instalar dependências

Na raiz:

```bash
npm install
```

Na API:

```bash
cd apps/api
npm install
```

No mobile:

```bash
cd ../mobile
npm install
```

### 4. Configurar variáveis de ambiente

Volte para a raiz do projeto e crie o `.env`:

```bash
cd ../..
cp .env.example .env
```

Edite o `.env` e preencha, no mínimo:

```env
PG_PASSWORD=uma_senha_local_forte
JWT_SECRET=um_segredo_jwt_forte
AES_ENCRYPTION_KEY_V1=chave_aes_em_base64
EMAIL_LOOKUP_HMAC_KEY=chave_hmac_forte
CORS_ORIGIN=http://localhost:8081,http://localhost:19006,http://localhost:3000,http://127.0.0.1:8081
```

Para gerar valores seguros, use os scripts da API:

```bash
cd apps/api
npm run jwt:secret
npm run aes:key
```

Copie os valores gerados para o `.env`.

### 5. Subir banco e backend com Docker

Na raiz do projeto:

```bash
docker compose up -d --build
```

Serviços esperados:

| Serviço | URL/porta | Observação |
|---|---|---|
| API | `http://localhost:3000` | Backend Express. |
| Health check | `http://localhost:3000/ping` | Verifica se a API subiu. |
| PostgreSQL | `localhost:5434` | Porta externa mapeada para o host. |
| Banco no Docker | `db:5432` | Host usado internamente pela API. |

Validar API:

```bash
curl http://localhost:3000/ping
```

Resposta esperada:

```json
{
  "message": "Backend funcionando corretamente."
}
```

### 6. Executar o aplicativo mobile

Em outro terminal:

```bash
cd apps/mobile
npm start
```

Atalhos comuns do Expo:

| Tecla | Ação |
|---|---|
| `a` | Abrir no Android. |
| `i` | Abrir no iOS, em macOS. |
| `w` | Abrir no navegador. |

Se estiver usando celular físico, configure a URL da API para o IP da sua máquina na rede local, pois `localhost` no celular aponta para o próprio aparelho.

Exemplo:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
```

### Build Android para testes externos

O app possui perfis EAS para gerar um APK instalável sem Expo Go e um AAB de
produção. O procedimento completo, incluindo o vínculo inicial da conta EAS e
a configuração da URL pública da API, está em
[`docs/eas-android-build.md`](docs/eas-android-build.md).

Resumo do build de validação:

```bash
cd apps/mobile
npm run build:android:preview
```

## Variáveis de ambiente

O arquivo `.env.example` na raiz é a referência oficial para configuração local. Nunca versione segredos reais.

### Banco de dados

| Variável | Obrigatória | Exemplo | Descrição |
|---|---|---|---|
| `PG_USER` | Sim | `myfetus_app` | Usuário do PostgreSQL. |
| `PG_PASSWORD` | Sim | `senha_forte` | Senha do banco. |
| `PG_DATABASE` | Sim | `myfetus` | Nome do banco. |
| `PG_HOST` | Sim | `db` | Host interno no Docker. |
| `PG_PORT` | Sim | `5432` | Porta interna no Docker. |
| `DB_ROTATION_HOST` | Não | `localhost` | Host usado por scripts de rotação fora do Docker. |
| `DB_ROTATION_PORT` | Não | `5434` | Porta externa do PostgreSQL. |

### Backend e segurança

| Variável | Obrigatória | Exemplo | Descrição |
|---|---|---|---|
| `PORT` | Sim | `3000` | Porta da API. |
| `JWT_SECRET` | Sim | `valor_seguro` | Segredo para assinar tokens JWT. |
| `JWT_EXPIRES_IN` | Não | `8h` | Duração do token. |
| `CORS_ORIGIN` | Recomendado | `http://localhost:8081` | Origens permitidas para chamadas do app. |
| `NODE_ENV` | Sim | `development` | Ambiente de execução. |
| `TRUST_PROXY` | Produção | `1` | Confiança em proxy reverso. |
| `ENFORCE_HTTPS` | Produção | `true` | Força HTTPS em produção. |
| `HSTS_MAX_AGE_SECONDS` | Não | `31536000` | Cabeçalho HSTS. |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Não | `900000` | Janela de rate limit. |
| `AUTH_RATE_LIMIT_MAX` | Não | `10` | Limite para login. |
| `REGISTER_RATE_LIMIT_MAX` | Não | `5` | Limite para cadastro. |
| `ADMIN_READ_RATE_LIMIT_MAX` | Não | `100` | Limite para leitura administrativa. |
| `CLINICAL_RATE_LIMIT_MAX` | Não | `60` | Limite para consultas clínicas autenticadas. |
| `DATA_EXPORT_RATE_LIMIT_MAX` | Não | `5` | Limite para a exportação de dados do titular (confere senha). |
| `ACCOUNT_DELETION_RATE_LIMIT_MAX` | Não | `5` | Limite para a exclusão da conta pelo titular (confere senha). |

### Criptografia, documentos e IA

| Variável | Obrigatória | Exemplo | Descrição |
|---|---|---|---|
| `AES_KEY_VERSION` | Sim | `1` | Versão da chave de criptografia. |
| `AES_ENCRYPTION_KEY_V1` | Sim | `base64...` | Chave para criptografia em repouso. |
| `EMAIL_LOOKUP_HMAC_KEY` | Sim | `valor_seguro` | HMAC para busca por e-mail sem expor dado sensível. |
| `DOCUMENT_STORAGE_DIR` | Sim | `uploads/encrypted` | Diretório de documentos criptografados. |
| `DOCUMENT_MAX_UPLOAD_BYTES` | Não | `26214400` | Limite de upload. |
| `PINECONE_API_KEY` | RAG | `...` | Chave do Pinecone. |
| `PINECONE_INDEX_NAME` | RAG | `myfetus-rag` | Índice vetorial. |
| `PINECONE_NAMESPACE` | RAG | `guidelines` | Namespace da base clínica. |
| `EMBEDDING_MODEL` | RAG | `Xenova/multilingual-e5-small` | Modelo de embeddings. |
| `EMBEDDING_DIMENSION` | RAG | `384` | Dimensão dos embeddings. |
| `GEMINI_API_KEY` | Chat | `...` | Chave para geração de respostas. |
| `GEMINI_MODEL` | Chat | `gemini-2.5-flash` | Modelo de geração. |

## Banco de dados

O PostgreSQL é inicializado pelo Docker Compose com scripts SQL em `apps/api/db`.

Arquivos principais:

| Arquivo | Finalidade |
|---|---|
| `create_tables.sql` | Criação das tabelas principais. |
| `triggers.sql` | Triggers de atualização e consistência. |
| `migration.sql` | Migrações gerais. |
| `migration_sprint6_history.sql` | Histórico clínico e séries temporais. |
| `doctor_patient_links.sql` | Vínculo entre médico e gestante. |
| `migration_security_baseline.sql` | Base de segurança. |
| `migration_aes_encryption.sql` | Estrutura para criptografia AES. |
| `migration_document_security.sql` | Segurança de documentos. |
| `migration_audit_trail.sql` | Auditoria. |
| `loinc_table.sql` | Dados/estrutura de mapeamento LOINC. |

Principais tabelas:

| Tabela | Descrição |
|---|---|
| `users` | Usuários e papéis do sistema. |
| `doctors` | Dados profissionais dos médicos. |
| `pregnants` | Dados cadastrais e clínicos das gestantes. |
| `pregnancies` | Informações de cada gestação. |
| `pregnancy_events` | Eventos gestacionais. |
| `doctor_patient_links` | Vínculos médico-paciente. |
| `pregnant_documents` | Metadados de documentos enviados. |
| `medidas_fetais` | Medidas fetais. |
| `fetal_biometry_history` | Histórico de biometria fetal. |
| `maternal_weight_history` | Histórico de peso materno. |
| `audit_logs` | Registro de auditoria administrativa. |

Acesso rápido ao banco:

```bash
docker exec -it myfetus-db psql -U "$PG_USER" -d "$PG_DATABASE"
```

Se o shell não carregar as variáveis, use os valores do `.env` diretamente:

```bash
docker exec -it myfetus-db psql -U myfetus_app -d myfetus
```

### Ciclo de vida e Migrações

- **Inicialização limpa (novo volume):** O PostgreSQL executa os arquivos de `/docker-entrypoint-initdb.d/` (`01_create_tables.sql` a `12_record_initial_migrations.sql`) na ordem léxica durante o primeiro boot de um volume vazio (`db_data`). O último script registra as migrations já executadas em `schema_migrations`.
- **Atualização com preservação de dados (volume existente):** O Docker pula `/docker-entrypoint-initdb.d/` se o volume `db_data` já existir. Para aplicar novas alterações sem perda de dados, o MyFetus utiliza o script `scripts/migrate.js` (com a tabela de controle `schema_migrations`), executado automaticamente em `npm run setup` ou sob demanda via:
  ```bash
  npm run db:migrate
  ```
- **Reset completo do banco:** Caso deseje apagar todos os dados e recriar o volume do zero:
  ```bash
  npm run setup -- --reset
  # ou
  npm run docker:reset
  ```

## API

URL base local:

```text
http://localhost:3000/api
```

### Documentação OpenAPI (Swagger)

O contrato da API fica versionado em [`apps/api/openapi.yaml`](apps/api/openapi.yaml) (OpenAPI 3.1) e é a fonte de verdade das rotas, parâmetros, corpos, respostas, autenticação e papéis. Com a API rodando:

| URL | Conteúdo |
|---|---|
| `http://localhost:3000/docs/` | Swagger UI (somente leitura; "Try it out" desabilitado). |
| `http://localhost:3000/docs/openapi.json` | Especificação em JSON. |
| `http://localhost:3000/docs/openapi.yaml` | Especificação bruta (o mesmo arquivo versionado). |

O `/docs` é público, não acessa o banco nem dados clínicos e tem rate limit (`DOCS_RATE_LIMIT_MAX`, padrão 300 a cada 15 min). Os exemplos do contrato são sintéticos.

**Ao criar ou alterar uma rota**, atualize o `openapi.yaml` no mesmo PR. O teste `tests/openapiContract.test.js` (no `npm run test:ci`) falha quando:

- uma rota do Express não está documentada (ou não está em `config/openapiAllowlist.js` com justificativa);
- um path documentado não existe mais no Express;
- a operação não declara `security`, ou declara diferente do `authenticateToken` da rota;
- `x-roles` diverge do `requireRole(...)` da rota.

Verificação local: `npm run docs:check` (dentro de `apps/api`).

### Rotas principais

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `POST` | `/api/users` | Não | Cria usuário (exige aceite do termo vigente em `consents`). |
| `POST` | `/api/users/login` | Não | Realiza login, retorna JWT e termos pendentes (`consent`). |
| `GET` | `/api/consents/policy` | Não | Finalidades (termos, política, consentimentos), versões e textos por perfil. |
| `GET` | `/api/consents/me` | JWT | Status de consentimento do usuário autenticado. |
| `POST` | `/api/consents` | JWT | Registra aceite, recusa ou revogação do próprio usuário. |
| `GET` | `/api/users` | Admin | Lista usuários. |
| `GET` | `/api/users/:id` | JWT | Consulta usuário por ID. |
| `PUT` | `/api/users/:id` | JWT | Atualiza usuário. |
| `DELETE` | `/api/users/:id` | Admin | Remove usuário. |
| `POST` | `/api/doctors` | Não | Cria conta médica (exige termos do médico e ciência da política em `consents`). |
| `GET` | `/api/pregnants` | Médico/Admin | Lista gestantes. |
| `POST` | `/api/pregnants` | Gestante/Admin | Cria registro de gestante. |
| `GET` | `/api/pregnants/:id` | Própria gestante/Médico vinculado/Admin | Consulta gestante. |
| `PUT` | `/api/pregnants/:id` | Médico/Admin | Atualiza gestante. |
| `GET` | `/api/pregnants/:id/alerts` | Médico vinculado/Admin | Consulta alertas de risco. |
| `POST` | `/api/pregnancies` | Gestante/Médico/Admin | Cria gestação. |
| `GET` | `/api/pregnancies` | Gestante/Médico/Admin | Lista gestações. |
| `PUT` | `/api/pregnancies/:id` | Médico/Admin | Atualiza gestação. |
| `POST` | `/api/pregnancyEvents` | Médico/Admin | Cria evento gestacional. |
| `GET` | `/api/pregnancyEvents` | Gestante/Médico/Admin | Lista eventos. |
| `PUT` | `/api/pregnancyEvents/:id` | Médico/Admin | Atualiza evento. |
| `POST` | `/api/documents` | Médico/Admin | Faz upload de documento. |
| `GET` | `/api/documents` | Médico/Admin | Lista documentos por `pregnant_id`. |
| `GET` | `/api/documents/:id` | Médico/Admin | Consulta documento. |
| `GET` | `/api/documents/:id/download` | Médico/Admin | Baixa documento. |
| `GET` | `/api/documents/:id/text` | Médico/Admin | Consulta texto extraído. |
| `POST` | `/api/documents/:id/extract` | Médico/Admin | Reprocessa extração. |
| `PUT` | `/api/documents/:id` | Médico/Admin | Atualiza metadados. |
| `DELETE` | `/api/documents/:id` | Médico/Admin | Remove documento. |
| `POST` | `/api/medicoes` | Médico/Admin | Registra medida fetal. |
| `GET` | `/api/history/pregnancies/:pregnancyId` | Gestante/Médico/Admin | Consulta histórico clínico. |
| `POST` | `/api/history/pregnancies/:pregnancyId/fetal-biometries` | Médico/Admin | Registra biometria fetal. |
| `POST` | `/api/history/pregnancies/:pregnancyId/maternal-weights` | Médico/Admin | Registra peso materno. |
| `GET` | `/api/growth/chart` | JWT | Consulta dados de gráfico de crescimento. |
| `POST` | `/api/growth/percentile` | JWT | Calcula percentil. |
| `POST` | `/api/internal/loinc/term` | Admin | Mapeia termo único para LOINC. |
| `POST` | `/api/internal/loinc/text` | Admin | Mapeia bloco de texto para LOINC. |
| `POST` | `/api/internal/rag/search` | JWT | Busca semântica na base clínica. |
| `POST` | `/api/internal/rag/chat` | JWT | Chat clínico com RAG. |
| `POST` | `/api/internal/rag/chat/agents` | JWT | Chat multiagente. |
| `GET` | `/api/internal/rag/stats` | Admin | Estatísticas da base RAG. |
| `POST` | `/api/agent/maternal-analysis` | JWT + `medico` (vinculado) / `admin` | Análise materna por agente. |
| `GET` | `/api/admin/audit` | Admin | Lista auditoria. |
| `POST` | `/api/sync` | Admin | Sincronização administrativa. |

Para exemplos de payloads e comandos `curl`, consulte:

- `apps/api/API_USAGE.md`
- `apps/api/CURL_RAG_EXAMPLES.md`

## Processamento de documentos

O módulo de documentos permite:

- upload de arquivos vinculados a gestantes;
- armazenamento controlado no backend;
- criptografia de arquivos sensíveis;
- extração de texto com PDF.js;
- fallback para OCR com Tesseract.js;
- consulta do texto extraído via API;
- reprocessamento manual da extração;
- geração de relatórios de acurácia em fixtures sintéticas.

### Dataset sintético de extração

O benchmark E2-09 usa somente dados fictícios e determinísticos: 50 PDFs nativos
(10 por tipo, distribuídos entre três laboratórios fictícios) e 25 documentos
escaneados renderizados como fotos sintéticas. Cada ground truth registra o tipo,
laboratório, layout, dificuldade e método esperado. Os casos escaneados não são
versionados como binários: são gerados no CI para manter o repositório leve.

O limiar técnico do benchmark é sobreposição de tokens extraídos, não acurácia
clínica: 90% para PDF.js e 70% para OCR. O job `pdf-dataset` executa os dois
métodos, gera o relatório e falha se a cobertura mínima ou algum caso ficar
abaixo do limiar. Casos reais, metadados pessoais e decisões clínicas não fazem
parte deste dataset.

Fluxo resumido:

```text
Upload do exame
      |
      v
Registro em pregnant_documents
      |
      v
Worker de extração
      |
      v
PDF.js ou OCR
      |
      v
Texto extraído + metadados
      |
      v
Consulta pela API e uso em análises clínicas
```

## RAG e chat clínico

O módulo RAG utiliza uma base de conhecimento clínica para apoiar consultas de profissionais de saúde.

Componentes principais:

| Componente | Responsabilidade |
|---|---|
| `ragController.js` | Expor endpoints HTTP de busca e chat. |
| `rag.js` | Registrar rotas `/api/internal/rag/*`. |
| Serviços de chunking | Dividir documentos clínicos em trechos recuperáveis. |
| Serviços de embedding | Transformar texto em vetores. |
| Pinecone | Armazenar e recuperar vetores por similaridade. |
| Gemini | Gerar resposta em linguagem natural com base no contexto recuperado. |
| Sanitização de PII | Reduzir exposição de dados sensíveis antes de IA. |

Endpoints:

```text
POST /api/internal/rag/search
POST /api/internal/rag/chat
POST /api/internal/rag/chat/agents
GET  /api/internal/rag/stats
```

Exemplo de busca:

```bash
curl -X POST http://localhost:3000/api/internal/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query":"Quais sinais indicam risco de pré-eclâmpsia?","topK":3}'
```

## Segurança e privacidade

Recursos implementados:

- JWT para autenticação.
- Controle de acesso por papel.
- Rate limit em login, cadastro e rotas administrativas.
- Hash de senhas com bcrypt.
- Criptografia AES para dados sensíveis.
- Criptografia de documentos.
- HMAC para busca segura por e-mail.
- Sanitização de PII em logs e fluxos de IA.
- Auditoria administrativa.
- Suporte a HTTPS/HSTS em ambiente de produção.
- Restrição de CORS por origem configurável.

### Autorização de dados clínicos

O controle de acesso da API combina até três verificações, nesta ordem:

1. **Autenticação** (`authenticateToken`): exige `Authorization: Bearer <JWT>` válido e não expirado; caso contrário, `401`.
2. **Papel** (`requireRole`): o papel do token (`gestante`, `medico`, `admin`) precisa estar autorizado na rota; caso contrário, `403`.
3. **Vínculo com o recurso** (`ensureCanAccessPregnant`, em `utils/clinicalAccess.js`): `admin` acessa qualquer gestante; `gestante` acessa apenas o próprio registro; `medico` acessa apenas gestantes com vínculo `active` em `doctor_patient_links`. Sem vínculo, `403` — antes de qualquer leitura do prontuário.

Essa mesma checagem é aplicada antes de carregar alertas, histórico, gestações,
eventos e documentos. O teste `apps/api/tests/crossPatientAuthorization.test.js`
mantém o caso de regressão: a gestante A pode consultar seus próprios dados,
mas recebe `403` e nenhum dado clínico da gestante B é lido quando tenta usar o
identificador de B. O CI executa `npm audit --audit-level=high` nos lockfiles da
raiz e da API; o Dependabot acompanha os três workspaces npm e as GitHub Actions.

Aplicação nas rotas corrigidas na E1-05 (issue #43):

| Rota | Regra |
|---|---|
| `POST /api/agent/maternal-analysis` | JWT + papel `medico`/`admin` + vínculo com o `patientId` enviado. Gestante recebe `403`. Para médico, o vínculo é verificado antes da existência: ID sem vínculo e ID inexistente recebem o mesmo `403`, evitando enumeração de IDs. |
| `GET /api/growth/chart`, `POST /api/growth/percentile` | JWT obrigatório (qualquer papel), aplicado no router de `/api/growth`. |

Antes da correção, qualquer usuário autenticado podia trocar o `patientId` no corpo de `/api/agent/maternal-analysis` e receber a análise do prontuário descriptografado de outra paciente (IDOR). Agora o `patientId` é validado como inteiro e o vínculo é verificado antes das consultas clínicas; os testes `tests/agentController.test.js` comprovam que, ao trocar o ID, nenhuma consulta ao prontuário é executada e nenhum dado chega ao agente.

Recomendações para continuidade:

- Nunca versionar `.env` com segredos reais.
- Rotacionar `JWT_SECRET`, `AES_ENCRYPTION_KEY_V1` e `PG_PASSWORD` ao mudar de ambiente.
- Usar HTTPS em qualquer ambiente exposto publicamente.
- Validar permissões antes de liberar dados clínicos reais.
- Manter auditoria ativa para operações administrativas.

## Testes

### Testes na raiz

| Comando | O que valida |
|---|---|
| `npm test` | Executa a suite Jest configurada na raiz. |
| `npm run generate:dataset` | Gera fixtures sintéticas de PDFs para testes. |
| `npm run generate:dataset:ocr` | Gera fixtures escaneadas para validar OCR. |
| `npm run test:pdf-extractor` | Testa extração de texto em documentos PDF. |
| `npm run accuracy:pdf` | Gera relatorio de acurácia da extração. |

Para exigir também a cobertura OCR no relatório local, gere os fixtures e rode:

```bash
npm run generate:dataset:ocr
REQUIRE_OCR=true npm run accuracy:pdf
```

### Testes da API

Execute dentro de `apps/api`.

| Comando | O que valida |
|---|---|
| `npm run test:pii` | Verifica mascaramento/remoção de dados sensíveis. |
| `npm run test:logger` | Verifica comportamento do logger e sanitização de logs. |
| `npm run test:security-baseline` | Valida a base de segurança da API. |
| `npm run test:transport-security` | Verifica configurações de HTTPS/HSTS. |
| `npm run test:crypto` | Testa criptografia e descriptografia de dados. |
| `npm run test:file-crypto` | Testa proteção criptográfica de arquivos. |
| `npm run test:clinical-crypto` | Valida criptografia aplicada a dados clínicos. |
| `npm run test:db` | Testa integração com PostgreSQL via Docker. |
| `npm run test:loinc` | Testa mapeamento de termos clínicos para LOINC. |
| `npm run test:rag` | Valida chunking, embeddings, vector store e busca RAG. |
| `npm run test:stress` | Testa componentes do simulador de estresse. |
| `npm run test:generation-service` | Testa serviço de geração de respostas. |
| `npm run test:agent-controller` | Testa autenticação, papel e vínculo (IDOR) em `/api/agent/maternal-analysis`. |
| `node --test ./tests/growthRoutes.test.js` | Testa exigência de JWT em `/api/growth/*` e o acesso autenticado. |
| `npm run docs:check` | Valida o `openapi.yaml`, a cobertura das rotas (auth e papéis) e o smoke test de `/docs`. |
| `npm run test:hadlockCalculator` | Valida cálculos associados a crescimento fetal. |
| `npm run test:clinical-history` | Valida histórico clínico e séries temporais. |

### Testes do mobile

Execute dentro de `apps/mobile`.

| Comando | O que valida |
|---|---|
| `npm run lint` | Verifica padrões de codigo do app Expo. |
| `npm start` | Sobe o app para validação manual em Expo. |
| `npm run android` | Abre no Android. |
| `npm run ios` | Abre no iOS, quando disponível. |
| `npm run web` | Abre no navegador. |

### Fluxo recomendado antes de abrir PR

```bash
npm test
npm run test:pdf-extractor
npm run accuracy:pdf

cd apps/api
npm run test:pii
npm run test:logger
npm run test:crypto
npm run test:rag

cd ../mobile
npm run lint
```

## CI/CD e deploy

O processo completo de CI/CD, incluindo o contrato independente de provedor,
a configuração atual no GCP, OIDC, permissões, secrets, migrations, smoke
tests, rollback, custos e o procedimento para trocar de cloud está em
[`docs/ci-cd.md`](docs/ci-cd.md).

A implementação atual do ambiente GCP está detalhada em
[`docs/ci-cd-gcp-staging.md`](docs/ci-cd-gcp-staging.md). O workflow
[`.github/workflows/cd-staging.yml`](.github/workflows/cd-staging.yml):

1. executa após merge em `main` ou manualmente;
2. aguarda aprovação do environment `staging`;
3. autentica por OIDC, sem chave JSON;
4. publica a imagem usando o SHA do commit;
5. executa migrations antes de atualizar a API;
6. roda smoke tests HTTPS e valida a proteção JWT.

Para trocar o provedor, preserve a ordem e as garantias do pipeline e substitua
apenas o adaptador de autenticação, registry, executor de migrations e runtime.
O backend atual é um container Express de longa duração com worker de documentos;
plataformas serverless de funções exigem uma adaptação arquitetural documentada
antes de serem usadas.

## Scripts úteis

### Raiz

```bash
npm test
npm run generate:dataset
npm run generate:dataset:ocr
npm run test:pdf-extractor
npm run accuracy:pdf
```

### API

```bash
cd apps/api
npm run dev
npm run start
npm run jwt:secret
npm run jwt:test-token
npm run jwt:rotate
npm run db:rotate-password
npm run aes:key
npm run aes:init
npm run extract:documents
npm run rag:ingest
```

### Mobile

```bash
cd apps/mobile
npm start
npm run android
npm run ios
npm run web
npm run lint
```

## Credenciais de teste

Não há credenciais fixas versionadas no repositório. Para testar localmente, crie usuários por API ou pela interface do app.

### Criar usuário gestante

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gestante Teste",
    "email": "gestante.teste@example.com",
    "password": "SenhaTeste123!",
    "role": "gestante"
  }'
```

### Criar médico

```bash
curl -X POST http://localhost:3000/api/doctors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Médico Teste",
    "email": "medico.teste@example.com",
    "password": "SenhaTeste123!",
    "crm": "123456",
    "specialty": "Obstetricia",
    "phone": "81999999999"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gestante.teste@example.com",
    "password": "SenhaTeste123!"
  }'
```

Use o token retornado em:

```http
Authorization: Bearer <token>
```

Também é possível gerar token local para testes:

```bash
cd apps/api
npm run jwt:test-token
```

## Bugs conhecidos

Até o momento, a equipe não identificou bugs conhecidos na versão entregue do projeto.

Durante a continuidade do desenvolvimento, recomenda-se registrar qualquer problema encontrado em issues do GitHub com:

- descrição do problema;
- passos para reproduzir;
- comportamento esperado;
- comportamento atual;
- prints/logs quando houver;
- ambiente usado para teste.

## Limitações e backlog futuro

Itens ainda recomendados para continuidade:

| Item | Descrição |
|---|---|
| Deploy de produção | Criar ambiente separado, domínio, observabilidade e aprovação de produção. |
| Integrações adicionais | Adicionar testes DAST, carga e integração com banco efêmero. |
| Seeds de desenvolvimento | Criar massa de dados padronizada para demos e testes locais. |
| Cobertura mobile | Ampliar testes automatizados no aplicativo. |
| Observabilidade | Incluir métricas, tracing e dashboards de saúde da API. |
| Revisão clínica externa | Validar regras e respostas de IA com profissional habilitado antes de uso real. |
| Deploy RAG | Formalizar ingestão de base clínica real e política de atualização de documentos. |
| Proteção LGPD | Revisar fluxo completo de consentimento, retenção e descarte de dados. |

## Troubleshooting

### `docker compose up` falha por variável ausente

Verifique se `.env` existe na raiz e se `PG_USER`, `PG_PASSWORD` e `PG_DATABASE` estão preenchidos.

### API sobe, mas o app não conecta

- Em emulador Android, tente `http://10.0.2.2:3000`.
- Em celular físico, use o IP da máquina na rede local.
- Confirme se a origem está em `CORS_ORIGIN`.
- Teste `curl http://localhost:3000/ping` no computador.

### Banco não reflete novas migrations

O Docker só executa scripts de `/docker-entrypoint-initdb.d` quando o volume é criado pela primeira vez. Para recriar o banco local:

```bash
docker compose down -v
docker compose up -d --build
```

Use esse comando com cuidado, pois ele apaga o volume local do banco.

### Erro de token inválido

- Confirme que a API e o script de teste usam o mesmo `JWT_SECRET`.
- Gere novo token após rodar `npm run jwt:rotate`.
- Verifique se o usuário possui o papel exigido pela rota.

### Erros no RAG

- Preencha `PINECONE_API_KEY`, `PINECONE_INDEX_NAME` e `PINECONE_NAMESPACE`.
- Confirme a dimensão de embedding em `EMBEDDING_DIMENSION`.
- Preencha `GEMINI_API_KEY` para rotas que geram resposta textual.
- Execute testes de RAG dentro de `apps/api`.

### Upload ou extração de PDF falha

- Verifique `DOCUMENT_MAX_UPLOAD_BYTES`.
- Confirme permissão de escrita em `DOCUMENT_STORAGE_DIR`.
- Rode `npm run test:pdf-extractor` na raiz.
- Rode `npm run extract:documents` dentro de `apps/api`.

## Documentação complementar

Arquivos importantes no repositório:

| Arquivo | Conteúdo |
|---|---|
| `docs/ci-cd.md` | Contrato de CI/CD, deploy, rollback e troca de provedor. |
| `docs/ci-cd-gcp-staging.md` | Implementação atual do CI/CD no Google Cloud. |
| `docs/lgpd/consentimento.md` | Consentimento LGPD no cadastro (E7-01.1) e decisões pendentes do P.O. |
| `apps/api/API_USAGE.md` | Exemplos de uso da API. |
| `apps/api/CURL_RAG_EXAMPLES.md` | Exemplos de chamadas RAG. |
| `apps/api/README_RAG_SPRINT4.md` | Documentação histórica do módulo RAG. |
| `apps/api/PostgresQL.md` | Notas de PostgreSQL. |
| `apps/api/db/README-modelagem.md` | Modelagem do banco. |
| `apps/api/db/AUDITORIA_SEGURANCA.md` | Auditoria e segurança. |
| `apps/mobile/README.md` | Informações especificas do app mobile. |
| `scripts/stress_test/README.md` | Testes de estresse. |

## Licença e uso

Projeto acadêmico desenvolvido no contexto da disciplina de Engenharia de Software. Antes de usar, distribuir ou adaptar fora do contexto original, consulte a equipe responsável e valide requisitos de privacidade, segurança e conformidade aplicáveis a dados de saúde.
