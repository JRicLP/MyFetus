# RAG API - Sprint 4 (Pessoa B)

## 📋 Visão Geral

Implementação da **Retrieval-Augmented Generation (RAG)** para o projeto MyFetus. A Pessoa B responsável por construir a API de busca semântica que consumirá embeddings da Pessoa A e servirá respostas para o chat clínico (DF).

### Status: Semana 1 ✅ Completa
- ✅ Contrato de tipos definido
- ✅ Dataset mock com 10 chunks clínicos
- ✅ Lógica de busca semântica (cosine similarity)
- ✅ Endpoint HTTP funcional
- ✅ Testes unitários (12/12 passando)
- ⏳ Aguardando Pessoa A para dados reais

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────┐
│  Chat Clínico (DF Interface)            │
└────────────────┬────────────────────────┘
                 │
                 │ POST /api/internal/rag/search
                 │ {query: string}
                 ▼
┌─────────────────────────────────────────┐
│  RAG Controller (ragController.js)      │
│  - searchKnowledgeBase()                │
│  - getRAGStats()                        │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Semantic Search (ragRetrieval.js)      │
│  - semanticSearch()                     │
│  - cosineSimilarity()                   │
│  - generateQueryEmbedding()             │
│  - getChunkStats()                      │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Data Layer                             │
│  ├─ MOCK_CHUNKS (rag-mock-data.js)     │ ← Semana 1
│  ├─ PostgreSQL (future)                │ ← Semana 4
│  └─ Vector DB (Pinecone)              │ ← Semana 4
└─────────────────────────────────────────┘
```

---

## 📁 Estrutura de Arquivos

```
apps/api/
├── controllers/
│   └── ragController.js          # Handlers HTTP para RAG
├── routes/
│   └── rag.js                    # Definição das rotas
├── utils/
│   └── ragRetrieval.js           # Lógica de busca semântica
├── data/
│   └── rag-mock-data.js          # Dataset mock com 10 chunks
├── types/
│   └── rag.types.js              # Definições de tipos (JSDoc)
├── tests/
│   └── ragRetrieval.test.js      # Testes unitários (12 testes)
├── CURL_RAG_EXAMPLES.md          # Exemplos de requisições
├── test_rag.sh                   # Script bash de testes
└── test_rag_complete.sh          # Suite completa de testes
```

---

## 🚀 Como Usar

### 1. Executar em Desenvolvimento

```bash
cd apps/api

# Terminal 1: Inicie o servidor
npm run dev

# Terminal 2: Rode os testes
npm run test:rag
```

### 2. Testar Endpoints (com JWT válido)

```bash
# Obter token JWT (teste local)
export JWT_TOKEN="seu_token_jwt_aqui"

# Ou gere um token compatível com o segredo atual do docker-compose.yml
npm run jwt:test-token

# Busca simples
curl -X POST http://localhost:3000/api/internal/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": "Como detectar pré-eclâmpsia?", "topK": 3}'

# Busca com filtros
curl -X POST http://localhost:3000/api/internal/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "Ultrassom obstétrico",
    "especialidade": "Radiologia",
    "fonte": "FEBRASGO",
    "topK": 2
  }'

# Estatísticas (admin only)
curl -X GET http://localhost:3000/api/internal/rag/stats \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 3. Testes Completos (com Docker)

```bash
cd /home/agil/dev/MyFetus

# Inicie os containers
docker compose up -d

# Rodando um teste simples
docker compose exec backend npm run test:rag

# Teste endpoint completo
bash apps/api/test_rag_complete.sh
```

---

## 📊 Dataset Mock (Semana 1)

10 chunks clínicos pré-carregados com temas:
- ✅ **Pré-eclâmpsia** (FEBRASGO) - 2 chunks
- ✅ **Anemia Gestacional** (FEBRASGO) - 1 chunk
- ✅ **Diabete Gestacional** (ACOG) - 1 chunk
- ✅ **Crescimento Fetal Restrito** (ACOG) - 1 chunk
- ✅ **Ganho de Peso** (FEBRASGO) - 1 chunk
- ✅ **Ultrassom Obstétrico** (FEBRASGO) - 1 chunk
- ✅ **Ruptura de Membranas** (ACOG) - 1 chunk
- ✅ **ITU Gestacional** (FEBRASGO) - 1 chunk

Cada chunk inclui:
- ID único
- Texto com 50-200 palavras
- Embedding mock (768 dimensões)
- Metadados clínicos

---

## 🔍 API Reference

### POST /api/internal/rag/search

**Autenticação:** JWT token obrigatório (qualquer role)

**Request:**
```json
{
  "query": "string (obrigatório)",
  "especialidade": "string (opcional)",
  "fonte": "string (opcional)",
  "tema": "string (opcional)",
  "topK": "number (default: 5, range: 1-20)"
}
```

**Response (200 OK):**
```json
{
  "source": "rag-v1-mock",
  "query": "Como detectar pré-eclâmpsia?",
  "resultados": [
    {
      "trecho": "...",
      "fonte": "FEBRASGO",
      "especialidade": "Obstetrícia",
      "tema": "Pré-eclâmpsia",
      "relevancia": 0.9184,
      "documento_id": "feb_001_chunk_001"
    }
  ],
  "total": 3,
  "tempo_ms": 12
}
```

**Erros:**
- 400: Query vazia ou topK inválido
- 401: Token não fornecido
- 500: Erro interno

---

### GET /api/internal/rag/stats

**Autenticação:** JWT token com role 'admin' obrigatório

**Response (200 OK):**
```json
{
  "source": "rag-v1-mock",
  "stats": {
    "total_chunks": 10,
    "especialidades": ["Obstetrícia", "Hematologia", "Radiologia"],
    "fontes": ["FEBRASGO", "ACOG"],
    "temas": ["Pré-eclâmpsia", "Anemia Gestacional", ...]
  },
  "ambiente": "test"
}
```

---

## ✅ Testes Unitários

12 testes automatizados cobrindo:
- ✅ Cosine similarity
- ✅ Query embedding geração
- ✅ Busca semântica básica
- ✅ Filtro por especialidade
- ✅ Filtro por fonte
- ✅ Filtro por tema
- ✅ Múltiplos filtros
- ✅ Validação (query vazia)
- ✅ Respeito ao topK
- ✅ Estrutura de resposta
- ✅ Estatísticas
- ✅ Performance (< 100ms)

**Executar:**
```bash
npm run test:rag
```

---

## 🔄 Fluxo de Transição (Semanas 2-4)

### Semana 2: Validação Local
- [ ] Tester cada caso de uso com curl
- [ ] Validar ordem de relevância
- [ ] Performance benchmarking
- [ ] Preparar para integração

### Semana 3: Integração com Pessoa A
- [ ] Receber payload de chunk real da Pessoa A
- [ ] Validar schema de metadados
- [ ] Adaptar embedding dimensionalidade (1536 para OpenAI)
- [ ] Criar importer do banco de dados

### Semana 4: Vector DB Real
- [ ] Receber credenciais Pinecone da DBB
- [ ] Implementar adapter para Pinecone
- [ ] Migrar dados do mock para Vector DB
- [ ] Testes de integração completos
- [ ] Deploy em staging

---

## 🔧 Configuração

### Variáveis de Ambiente (`.env`)

```bash
# Gerais
NODE_ENV=development
PORT=3000

# JWT (será definido por Persona A ou gerado)
JWT_SECRET=seu_secret_aqui
JWT_EXPIRES_IN=8h

# Vector DB (deixe vazio por agora, será definido na Semana 4)
PINECONE_API_KEY=xxx
PINECONE_ENVIRONMENT=xxx
PINECONE_INDEX=myfetus-clinical-kb
```

### Embeddings Mock vs Real

**Atualmente (Semana 1):**
- Embeddings gerados deterministicamente a partir da query
- Dimensionalidade: 768
- Finalidade: Testes locais

**Esperado (Semana 4):**
- Embeddings reais do modelo OpenAI (1536 dimensões)
- Gerados pela Pessoa A
- Armazenados no Pinecone

---

## 📝 Checklist para Próximas Semanas

- [ ] **Semana 2:** Validar todos os 8 casos de teste acima
- [ ] **Semana 2:** Benchmark de performance
- [ ] **Semana 3:** Alinhar schema final com Pessoa A
- [ ] **Semana 3:** Adaptar dimensionalidade de embeddings
- [ ] **Semana 4:** Obter credenciais Pinecone da DBB
- [ ] **Semana 4:** Implementar adapter Pinecone
- [ ] **Semana 4:** Testes de carga (100+ queries simultâneas)
- [ ] **Semana 4:** Deploy staging e testes com DF

---

## 🚨 Dependências Externas

| Semana | Responsável | O que | Status |
|--------|-------------|-------|--------|
| 2 | Pessoa B | Validação local | 🔴 Não iniciado |
| 3 | Pessoa A | Chunks + embeddings reais | 🔴 Não iniciado |
| 4 | DBB | Credenciais Pinecone | 🔴 Não iniciado |
| 4 | DF | Integração chat | 🔴 Não iniciado |

---

## 🎯 Entrega Esperada (Sprint 4)

```
✅ API RAG funcional
✅ Busca semântica com ranking
✅ Filtros por especialidade/fonte/tema
✅ Performance < 100ms por query
✅ Integração com Vector DB
✅ Testes e documentação
✅ Pronto para consumo pelo chat clínico
```

---

## 📞 Contato & Suporte

- **Pessoa B (Retrieval):** Você
- **Pessoa A (Ingestão):** Responsável por embeddings
- **DBB:** Provisiona Vector DB
- **DF:** Consome dados do RAG

Para dúvidas sobre a implementação, consulte:
1. `CURL_RAG_EXAMPLES.md` - Exemplos de requisições
2. `test_rag_complete.sh` - Script de testes completo
3. `ragRetrieval.test.js` - Testes unitários

---

## 📚 Referências

- [Cosine Similarity](https://en.wikipedia.org/wiki/Cosine_similarity)
- [Retrieval-Augmented Generation (RAG)](https://arxiv.org/abs/2005.11401)
- [Express.js Middlewares](https://expressjs.com/en/guide/using-middleware.html)
- [JWT Authentication](https://jwt.io/introduction)

---

**Última atualização:** 31 de maio de 2026  
**Status:** Semana 1 Completa ✅
