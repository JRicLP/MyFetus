# 🍼 MyFetus – Backend API  
API oficial do aplicativo **MyFetus**, responsável pelo gerenciamento de usuários, gestações e eventos importantes durante o período gestacional.  
A aplicação utiliza **Node.js + Express**, banco de dados **PostgreSQL**, e é totalmente containerizada com **Docker**.

---

## 📌 Tecnologias Utilizadas
- **Node.js 18+**
- **Express.js**
- **PostgreSQL 15-alpine**
- **Docker + Docker Compose**
- **bcryptjs** (hash de senha)
- **pg** (driver PostgreSQL)
- **dotenv**

---

# 🚀 Arquitetura da Aplicação

+-----------------------------+
| Frontend |
| (MyFetus Mobile) |
+-------------+---------------+
|
| REST API (3000)
v
+-------------------------------------------+
| Backend Node.js |
| - Express API |
| - Controllers, Models, Services |
| - Conexão via PG_DRIVER |
+------------------+------------------------+
|
| Internal Docker Network
v
+-------------------------------------------+
| PostgreSQL (myfetus-db) |
| - users |
| - pregnancies |
| - pregnancy_events |
| - persisted volumes |
+-------------------------------------------+


---

# 🐳 **Ambiente Docker**

## 📦 Estrutura do Docker Compose
O projeto utiliza **dois containers**:

### **1. PostgreSQL (`myfetus-db`)**
- Banco de dados principal.
- Executa um `init.sql` na primeira inicialização.
- Armazenamento persistente via volume `db_data`.

### **2. Backend Node (`myfetus-backend`)**
- Constrói a API a partir da pasta `./backend`.
- Só inicia após o banco estar saudável (`depends_on + healthcheck`).
- Expõe a API na porta **3000**.

---

# 🔧 Como executar o projeto

## 1️⃣ Clonar o repositório
```sh
git clone https://github.com/seu-usuario/myfetus-backend.git
cd myfetus-backend

2️⃣ Subir o ambiente completo com Docker
docker-compose up -d --build

->Acessar banco de dados
docker exec -it myfetus-db sh
psql -U myuser -d mydatabase

-Ver todas as tabelas:
\dt

Ver estrutura de uma tabela
\d users;

->Consultar dados:
SELECT * FROM users;
SELECT * FROM pregnants;
SELECT * FROM pregnancies;
SELECT * FROM pregnancyEvents;

->Sair do PostgreSQL
\q

->Sair do Container:
exit

->***Acesso rápido sem entrar no container:

docker exec -it myfetus-db psql -U myuser -d mydatabase

->Verificar se o Banco está rodando
docker ps | grep myfetus-db


O backend estará acessível em:

👉 http://localhost:3000

O banco PostgreSQL em:

👉 localhost:5433

🔧 Variáveis de Ambiente (Backend)

O backend utiliza as seguintes variáveis (configuradas automaticamente no Docker):

PG_USER=myuser
PG_PASSWORD=mypassword
PG_DATABASE=mydatabase
PG_HOST=myfetus-db
PG_PORT=5432
PORT=3000

🗄 Estrutura do Banco de Dados
Tabela: users
campo	tipo
id	int PK
name	text
email	text
password	hash
birthdate	date
is_active	boolean
role	user/admin
timestamps	auto
Tabela: pregnancies
campo	tipo
id	int PK
pregnant_id	FK → users
dum	date
dpp	date
ig_ultrassonografia	text
weeks	int
is_checked	boolean
dgm	int
regularidade_do_ciclo	boolean
ccn	text
glicemia	int
Tabela: pregnancy_events
campo	tipo
id	int PK
pregnancy_id	FK → pregnancies
descricao	text
data_evento	date
📡 Endpoints Principais
👤 Usuários
➤ GET /api/users

Retorna todos os usuários.

➤ POST /api/users

Cria novo usuário com senha criptografada.

🤰 Gestações
➤ GET /api/pregnancies

Lista todas as gestações.

➤ POST /api/pregnancies

Cria nova gestação e calcula automaticamente:

semanas gestacionais,

DPP,

verificações clínicas.

📅 Eventos da Gestação
➤ GET /api/pregnancyEvents

Lista todos os eventos registrados.

➤ POST /api/pregnancyEvents

Registra novos marcos (ultrassom, exames etc.).

🛠 Desenvolvimento (sem Docker)
1️⃣ Instalar dependências
cd backend
npm install

2️⃣ Criar .env
PG_USER=myuser
PG_PASSWORD=mypassword
PG_DATABASE=mydatabase
PG_HOST=localhost
PG_PORT=5432
PORT=3000

3️⃣ Iniciar servidor
npm run dev

📦 Produção

Usar:

docker-compose up -d --build


Log do backend:

docker logs -f myfetus-backend


Log do banco:

docker logs -f myfetus-db
