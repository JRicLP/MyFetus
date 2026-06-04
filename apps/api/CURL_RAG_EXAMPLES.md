# Exemplos de CURL - RAG API (Pessoa B)

## Setup: Obter JWT Token
```bash
# Para teste local, gere um token válido:
JWT_TOKEN="seu_token_jwt_aqui"

# Ou use um token de teste (requer NODE_ENV=test):
npm run jwt:secret:test  # Gera SECRET
node -e "
  const jwt = require('jsonwebtoken');
  const secret = 'seu_secret_base64_aqui';
  const token = jwt.sign(
    { userId: 1, name: 'Admin', role: 'admin', email: 'admin@test.com' },
    secret,
    { expiresIn: '8h' }
  );
  console.log('Bearer ' + token);
"
```

---

## 1. Busca Simples - Pré-eclâmpsia

```bash
curl -X POST http://localhost:3000/api/internal/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "Como detectar pré-eclâmpsia?",
    "topK": 5
  }'
```

**Response esperada:**
```json
{
  "source": "rag-v1-mock",
  "query": "Como detectar pré-eclâmpsia?",
  "resultados": [
    {
      "trecho": "Pré-eclâmpsia é uma complicação grave...",
      "fonte": "FEBRASGO",
      "especialidade": "Obstetrícia",
      "tema": "Pré-eclâmpsia",
      "relevancia": 0.8956,
      "documento_id": "feb_001_chunk_001"
    }
  ],
  "total": 3,
  "tempo_ms": 12
}
```

---

## 2. Busca com Filtro - Especialidade

```bash
curl -X POST http://localhost:3000/api/internal/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "Crescimento fetal",
    "especialidade": "Obstetrícia",
    "topK": 2
  }'
```

---

## 3. Busca com Filtro - Fonte

```bash
curl -X POST http://localhost:3000/api/internal/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "Hemoglobina gestacional",
    "fonte": "FEBRASGO",
    "topK": 3
  }'
```

---

## 4. Busca com Filtro - Tema

```bash
curl -X POST http://localhost:3000/api/internal/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "Recomendações",
    "tema": "Anemia Gestacional",
    "topK": 5
  }'
```

---

## 5. Busca com Múltiplos Filtros

```bash
curl -X POST http://localhost:3000/api/internal/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "Ultrassonografia obstétrica",
    "especialidade": "Radiologia",
    "fonte": "FEBRASGO",
    "topK": 2
  }'
```

---

## 6. Busca de Protocolo (ACOG)

```bash
curl -X POST http://localhost:3000/api/internal/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "Diabete gestacional rastreamento",
    "fonte": "ACOG",
    "topK": 3
  }'
```

---

## 7. Estatísticas do RAG (Admin only)

```bash
curl -X GET http://localhost:3000/api/internal/rag/stats \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response esperada:**
```json
{
  "source": "rag-v1-mock",
  "stats": {
    "total_chunks": 10,
    "especialidades": ["Obstetrícia", "Hematologia", "Radiologia", "Nutrição", "Infecção"],
    "fontes": ["FEBRASGO", "ACOG"],
    "temas": ["Pré-eclâmpsia", "Anemia Gestacional", "Diabete Gestacional", ...]
  },
  "ambiente": "test"
}
```

---

## 8. Erro - Query Vazia

```bash
curl -X POST http://localhost:3000/api/internal/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": "", "topK": 5}'
```

**Response esperada:**
```json
{
  "error": "query é obrigatória e deve ser uma string"
}
```

---

## 9. Erro - topK Fora do Range

```bash
curl -X POST http://localhost:3000/api/internal/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": "teste", "topK": 50}'
```

**Response esperada:**
```json
{
  "error": "topK deve estar entre 1 e 20"
}
```

---

## 10. Erro - Sem Autorização (sem token)

```bash
curl -X POST http://localhost:3000/api/internal/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "teste", "topK": 5}'
```

**Response esperada:**
```json
{
  "message": "Token de autenticação não fornecido"
}
```

---

## Fluxo de Teste Completo (Bash)

```bash
#!/bin/bash
set -e

BASE_URL="http://localhost:3000"
JWT_TOKEN="seu_token_jwt"

echo "1️⃣  Teste simples"
curl -s -X POST "$BASE_URL/api/internal/rag/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": "Pré-eclâmpsia", "topK": 3}' | jq '.total'

echo "2️⃣  Teste com filtros"
curl -s -X POST "$BASE_URL/api/internal/rag/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": "Ultrassom", "especialidade": "Radiologia", "topK": 2}' | jq '.resultados | length'

echo "3️⃣  Teste estatísticas"
curl -s -X GET "$BASE_URL/api/internal/rag/stats" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.stats.total_chunks'

echo "✅ Testes passaram!"
```

