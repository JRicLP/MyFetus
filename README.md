# MyFetus

**MyFetus** é um sistema acadêmico de acompanhamento gestacional desenvolvido na Escola Politécnica da UPE. O projeto conecta gestantes e médicos em uma plataforma com aplicativo mobile, API REST, banco PostgreSQL e recursos de gestão clínica, acompanhamento fetal e processamento de documentos.

O repositório está organizado como um monorepo: a aplicação mobile fica em `apps/mobile`, a API em `apps/api`, e há scripts/testes na raiz para validar a extração de texto de documentos PDF.

## Funcionalidades

### Gestante

- Acompanhamento semana a semana da gestação, com imagens e informações do desenvolvimento fetal.
- Cálculo de idade gestacional e data provável do parto.
- Checklist de cuidados por fase da gestação.
- Controle diário de hidratação.
- Login, cadastro e navegação por área da paciente.

### Médico

- Dashboard de pacientes.
- Prontuário da gestante com identificação, antecedentes familiares, antecedentes clínicos, histórico obstétrico, gestação atual, vacinas, exames e ultrassons.
- Resumo clínico consolidado da paciente.
- Registro e consulta de medidas fetais.
- Upload e consulta de documentos da gestante.

### Backend e documentos

- API REST em Node.js/Express com autenticação via JWT.
- PostgreSQL com tabelas para usuários, médicos, gestantes, gestações, eventos, documentos e medidas fetais.
- Upload de documentos com `multer`.
- Extração assíncrona de texto de PDFs usando PDF.js e OCR com Tesseract.js.
- Testes e relatórios de acurácia para extração de texto em fixtures sintéticas.

## Tecnologias

| Área | Tecnologias |
|---|---|
| Mobile | Expo SDK 56, React Native 0.85, React 19, TypeScript, Expo Router |
| API | Node.js, Express 5, PostgreSQL, JWT, bcrypt, multer |
| Documentos | PDF.js, Tesseract.js, `@napi-rs/canvas` |
| Infra | Docker, Docker Compose |
| Testes | Jest, scripts Node.js |

## Estrutura

```text
MyFetus/
├── apps/
│   ├── api/                    # Backend Node.js/Express
│   │   ├── controllers/         # Regras dos endpoints
│   │   ├── db/                  # SQL de schema, triggers e migrações
│   │   ├── middlewares/         # Autenticação e middlewares
│   │   ├── routes/              # Rotas REST
│   │   ├── services/            # Extração de PDF e serviços auxiliares
│   │   ├── utils/               # Logger, permissões, sanitização, helpers
│   │   ├── workers/             # Worker de extração de documentos
│   │   └── server.js            # Entrada da API
│   └── mobile/                 # App Expo/React Native
│       ├── app/                 # Rotas do Expo Router
│       │   ├── (tabs)/          # Área principal da gestante
│       │   └── doctor/          # Área do médico e prontuário
│       ├── assets/              # Imagens, fontes e ícones
│       ├── components/          # Componentes reutilizáveis
│       ├── constants/           # Cores e constantes
│       ├── hooks/               # Hooks React
│       └── utils/               # Utilitários do app
├── packages/
│   ├── shared/                  # Pacote compartilhado em TypeScript
│   └── sync-engine/             # Pacote reservado para sincronização
├── scripts/                     # Geração de dataset e relatório de acurácia
├── tests/                       # Testes e fixtures de PDFs
├── reports/                     # Relatórios gerados
├── docker-compose.yml           # PostgreSQL + backend
└── package.json                 # Scripts raiz
```

## Pré-requisitos

- Node.js 18 ou superior.
- npm.
- Docker e Docker Compose.
- Expo Go ou emulador Android/iOS para testar o app mobile.

## Como executar

### 1. Instale as dependências

Na raiz do repositório:

```bash
npm install
```

Instale também as dependências dos apps:

```bash
cd apps/api
npm install

cd ../mobile
npm install
```

### 2. Suba banco e backend com Docker

Na raiz do projeto:

```bash
docker compose up -d --build
```

Serviços iniciados:

- API: `http://localhost:3000`
- Health check simples: `http://localhost:3000/ping`
- PostgreSQL: `localhost:5434`
- Container do banco: `myfetus-db`
- Container do backend: `myfetus-backend`

O banco é inicializado pelos arquivos:

- `apps/api/db/create_tables.sql`
- `apps/api/db/triggers.sql`

### 3. Inicie o app mobile

Em outro terminal:

```bash
cd apps/mobile
npm start
```

Atalhos úteis do Expo:

- `a`: abrir no Android.
- `i`: abrir no iOS, em macOS.
- `w`: abrir no navegador.

Se usar um dispositivo físico, ajuste as chamadas para a API para usar o IP da máquina na rede local em vez de `localhost`.

## Variáveis de ambiente

Com Docker, as principais variáveis já estão definidas no `docker-compose.yml`.

Para rodar a API fora do Docker, crie `apps/api/.env`:

```env
PG_USER=myuser
PG_PASSWORD=mypassword
PG_DATABASE=mydatabase
PG_HOST=localhost
PG_PORT=5434
PORT=3000

JWT_SECRET=uma_chave_grande_de_teste
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:8081,http://localhost:19006,http://localhost:3000

OCR_LANGUAGES=por+eng
PDF_TEXT_MIN_LENGTH_FOR_OCR=50
DOCUMENT_EXTRACTION_BATCH_SIZE=5
DOCUMENT_EXTRACTION_INTERVAL_MS=30000
```

Dentro da rede Docker, o backend usa `PG_HOST=db` e `PG_PORT=5432`.

## Scripts úteis

Na raiz:

```bash
npm test
npm run test:pdf-extractor
npm run generate:dataset
npm run generate:dataset:ocr
npm run accuracy:pdf
```

Na API:

```bash
cd apps/api
npm run dev
npm run start
npm run extract:documents
npm run test:pii
npm run test:logger
npm run test:db
```

No mobile:

```bash
cd apps/mobile
npm start
npm run android
npm run ios
npm run web
npm run lint
```

## API

A URL base padrão é:

```text
http://localhost:3000/api
```

Rotas principais:

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/users` | Cria usuário |
| `POST` | `/api/users/login` | Autentica usuário |
| `GET` | `/api/users` | Lista usuários |
| `GET` | `/api/pregnants` | Lista gestantes |
| `POST` | `/api/pregnants` | Cria registro de gestante |
| `GET` | `/api/pregnancies` | Lista gestações |
| `POST` | `/api/pregnancies` | Cria gestação |
| `GET` | `/api/pregnancyEvents` | Lista eventos gestacionais |
| `POST` | `/api/pregnancyEvents` | Cria evento gestacional |
| `POST` | `/api/documents` | Faz upload de documento |
| `GET` | `/api/documents/:id/text` | Consulta texto extraído |
| `POST` | `/api/documents/:id/extract` | Reprocessa extração |
| `POST` | `/api/medicoes` | Registra medida fetal |
| `POST` | `/api/sync` | Sincronização administrativa |

Algumas rotas exigem `Authorization: Bearer <token>`. Consulte `apps/api/API_USAGE.md` para exemplos de payloads e comandos `curl`.

## Banco de dados

Principais tabelas:

- `users`: usuários do sistema com papéis `gestante`, `medico` e `admin`.
- `doctors`: dados profissionais de médicos.
- `pregnants`: dados cadastrais, clínicos, obstétricos e vacinais das gestantes.
- `pregnancies`: informações de cada gestação.
- `pregnancy_events`: eventos e intercorrências da gestação.
- `pregnant_documents`: documentos enviados e metadados da extração de texto.
- `medidas_fetais`: medidas fetais por idade gestacional.

Acesso rápido ao banco:

```bash
docker exec -it myfetus-db psql -U myuser -d mydatabase
```

## Testes de extração de PDF

O projeto inclui fixtures nativas e escaneadas em `tests/fixtures/pdfs`.

Fluxo recomendado:

```bash
npm run generate:dataset
npm run test:pdf-extractor
npm run accuracy:pdf
```

Para gerar fixtures escaneadas com OCR:

```bash
npm run generate:dataset:ocr
```

Os relatórios de acurácia são gravados em `reports/`.

## Documentação complementar

- `apps/api/API_USAGE.md`: exemplos de uso da API.
- `apps/api/db/README-modelagem.md`: descrição da modelagem do banco.
- `apps/api/PostgresQL.md`: notas de PostgreSQL.
- `apps/mobile/documentations/`: documentos acadêmicos, mapas, jornada do usuário e materiais de requisitos.

## Licença

Projeto acadêmico. Consulte a equipe responsável antes de usar, distribuir ou adaptar fora do contexto original.
