# MyFetus

**MyFetus** é um aplicativo móvel voltado ao acompanhamento gestacional, desenvolvido para conectar gestantes e médicos em uma plataforma integrada. O app permite monitorar o desenvolvimento semana a semana do bebê, registrar dados clínicos e acompanhar a saúde da gestante de forma prática e acessível.

> Projeto acadêmico desenvolvido na **Escola Politécnica da UPE (Universidade de Pernambuco)**.

---

## Funcionalidades

### Para a Gestante
- **Acompanhamento semanal** — visualização do desenvolvimento do bebê semana a semana (semanas 4 a 41), com imagens ilustrativas e descrição do crescimento fetal.
- **Data Prevista do Parto (DPP)** — cálculo automático com base na data da última menstruação.
- **Tamanho do bebê** — comparação do tamanho do feto com referências populares por semana gestacional.
- **Checklist por trimestre** — lista de tarefas e cuidados recomendados para cada fase da gestação, com estado salvo localmente.
- **Controle de hidratação** — rastreamento diário do consumo de água com meta de 2 litros/dia, histórico e contagem por copo (200ml), garrafa (500ml) e garrafão (1L).
- **Cadastro e login** — autenticação segura com senhas criptografadas.

### Para o Médico
- **Dashboard de pacientes** — listagem de gestantes com indicador de risco (baseado em faixa etária).
- **Ficha clínica completa** — acesso a dados como antecedentes clínicos, antecedentes familiares, gestações anteriores, gestação atual, vacinação, histórico de exames, histórico de ultrassons e medidas fetais.
- **Resumo do paciente** — visão consolidada com cálculo de IMC, classificação de pressão arterial, idade gestacional e dados da gestação.
- **Gráfico de evolução** — acompanhamento gráfico de medidas fetais.
- **Upload de documentos** — envio e gestão de documentos das pacientes.

---

## Tecnologias

### Frontend (Mobile)
| Tecnologia | Versão |
|---|---|
| React Native | 0.79.5 |
| Expo | ~53.0.8 |
| Expo Router | ^5.0.7 |
| TypeScript | ~5.8.3 |
| React Navigation | ^7.x |
| Expo Linear Gradient | ~14.1.4 |
| AsyncStorage | 2.1.2 |
| React Native SVG | 15.11.2 |

### Backend
| Tecnologia | Versão |
|---|---|
| Node.js + Express | ^5.1.0 |
| PostgreSQL | 15 (Alpine) |
| `pg` (node-postgres) | ^8.16.0 |
| bcrypt | ^6.0.0 |
| multer | ^2.0.0 |
| express-validator | ^7.2.1 |
| dotenv | ^16.5.0 |

### Infraestrutura
- **Docker** + **Docker Compose** para orquestração dos serviços de banco de dados e backend.

---

## Estrutura do Projeto

```
MyFetus/
├── index.html               # Landing page do projeto
├── Contato.html             # Página de contato
├── mebers-presentation/     # Apresentações dos membros da equipe
└── myfetus-app/
    └── myFetus/
        ├── app/                     # Telas do aplicativo (Expo Router)
        │   ├── (tabs)/              # Navegação por abas (gestante)
        │   │   ├── index.tsx        # Home — desenvolvimento semanal
        │   │   ├── checklist.tsx    # Checklist por trimestre
        │   │   └── water-tracking.tsx # Controle de hidratação
        │   ├── doctor/              # Área do médico
        │   │   ├── dashboard.tsx    # Lista de pacientes
        │   │   └── [patientId]/     # Ficha clínica da paciente
        │   ├── login.tsx
        │   ├── welcome.tsx
        │   └── Cadastro.tsx
        ├── backend/                 # API REST (Node.js + Express)
        │   ├── server.js
        │   ├── backend.js           # Configuração do pool PostgreSQL
        │   ├── controllers/         # Lógica de negócio
        │   ├── routes/              # Endpoints da API
        │   ├── db/                  # Scripts SQL (tabelas e triggers)
        │   └── utils/
        ├── assets/                  # Imagens, fontes e ícones
        │   └── images/
        │       └── Fetus_weeks_img/ # Imagens das semanas 4–41
        ├── components/              # Componentes reutilizáveis
        ├── constants/               # Temas e cores
        ├── hooks/                   # Custom hooks
        ├── utils/                   # Utilitários (cálculos gestacionais)
        ├── documentations/          # Documentação do projeto
        └── docker-compose.yml
```

---

## Banco de Dados

O banco de dados PostgreSQL possui as seguintes tabelas principais:

- **`users`** — usuários do sistema (gestantes e médicos) com autenticação.
- **`pregnants`** — dados clínicos e antecedentes das gestantes (antropométricos, obstétricos, clínicos, familiares).
- **`pregnancies`** — informações de cada gestação registrada.
- **`pregnancy_events`** — eventos e intercorrências gestacionais.
- **`pregnant_documents`** — documentos das gestantes.
- **`medidas_fetais`** — tabela de referência com medidas esperadas por semana gestacional.

---

## Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://expo.dev/)
- [Docker](https://www.docker.com/) e Docker Compose

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/MyFetus.git
cd MyFetus/myfetus-app/myFetus
```

### 2. Suba o backend com Docker

```bash
docker-compose up -d
```

Isso irá iniciar:
- **`myfetus-db`** — PostgreSQL na porta `5433`
- **`myfetus-backend`** — API REST na porta `3000`

O banco de dados é inicializado automaticamente com o script `init.sql`.

### 3. Instale as dependências do app

```bash
npm install
# ou
yarn install
```

### 4. Inicie o aplicativo

```bash
npx expo start
```

Escolha a plataforma:
- `a` — Android (emulador ou dispositivo)
- `i` — iOS (apenas macOS)
- `w` — Web

---

## 🔌 API — Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/users` | Cadastrar usuário |
| `POST` | `/users/login` | Login |
| `GET` | `/users` | Listar usuários |
| `GET` | `/users/:id` | Buscar usuário por ID |
| `PUT` | `/users/:id` | Atualizar usuário |
| `DELETE` | `/users/:id` | Remover usuário |
| `POST` | `/pregnants` | Cadastrar gestante |
| `GET` | `/pregnants` | Listar gestantes |
| `GET` | `/pregnants/:id` | Buscar gestante por ID |
| `PUT` | `/pregnants/:id` | Atualizar gestante |
| `GET` | `/pregnancies` | Listar gestações |
| `POST` | `/pregnancy-events` | Registrar evento gestacional |
| `POST` | `/documents` | Upload de documento |

---

## Variáveis de Ambiente

Crie um arquivo `.env` na pasta `backend/` com as seguintes variáveis:

```env
PG_USER=myuser
PG_PASSWORD=mypassword
PG_DATABASE=mydatabase
PG_HOST=myfetus-db
PG_PORT=5432
PORT=3000
```

---

## Documentação

A pasta `documentations/` contém:
- **Análise SWOT** do projeto
- **Levantamento Inicial de Requisitos**
- **Jornada do Usuário** (Gestante)
- **Mapa de Empatia**
- **Mapeamento de Stakeholders**
- **Pitch** e **Relatório Técnico** (vídeos)

---

## Equipe

Desenvolvido por alunos da **Escola Politécnica da UPE**:

- **Gabriel Lins Alves do Nascimento**
- **Lucas**
- **Rafael Herculano**
- **Thiago Brito**
- **João Ricardo**
- **Diego Nery Romeiro**
- **Elaine**

---

## Licença

Este projeto é de caráter acadêmico. Consulte a equipe para informações sobre uso e distribuição.
