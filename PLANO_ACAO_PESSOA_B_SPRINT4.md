# Plano de Ação - Sprint 4 Pessoa B (RAG Retrieval API)

**Data:** 31 de maio de 2026  
**Sprint:** Sprint 4 (8 semanas totais)  
**Pessoa:** B (Retrieval API & Indexing)  
**Duração:** 4 semanas (estágio 2 de 2 do projeto)

---

## 1️⃣ SEMANA 1: Setup & Contrato ✅ CONCLUÍDA

### Objetivos
- ✅ Definir schema de chunks
- ✅ Definir contrato API
- ✅ Implementar lógica de busca semântica
- ✅ Criar dataset mock
- ✅ Montar endpoints básicos

### Tarefas Concluídas

#### 1.1 Contrato de Tipos (rag.types.js)
```typescript
// Definir estrutura de chunk
ChunkMetadata {
  fonte: string      // FEBRASGO, ACOG
  especialidade: string
  tema: string
  seção: string
  tipo: string       // recomendação, definição, protocolo
}

Chunk {
  id: string
  texto: string
  embedding: number[]  // 768 dimensões (mock) → 1536 (real)
  metadados: ChunkMetadata
}
```

**Status:** ✅ Definido e documentado

#### 1.2 Dataset Mock (rag-mock-data.js)
- 10 chunks clínicos de exemplo
- Cobrem 5 especialidades (Obstetrícia, Hematologia, Radiologia, Nutrição, Infecção)
- Incluem 2 fontes (FEBRASGO, ACOG)
- 8 temas diferentes
- Embeddings determinísticos para testes

**Status:** ✅ Implementado

#### 1.3 Algoritmo de Busca (ragRetrieval.js)
Implementado em 4 funções:
1. `cosineSimilarity()` - Calcula similaridade entre vetores
2. `generateQueryEmbedding()` - Gera embedding mock para query
3. `semanticSearch()` - Executa busca com ranking e filtros
4. `getChunkStats()` - Estatísticas do knowledge base

**Features:**
- Suporta filtros opcionais (especialidade, fonte, tema)
- Respeita limite topK (1-20)
- Ordena por relevância (0-1)
- Performance < 1ms

**Status:** ✅ Implementado e testado

#### 1.4 Endpoints HTTP (ragController.js + rag.js)
- `POST /api/internal/rag/search` - Busca semântica
- `GET /api/internal/rag/stats` - Estatísticas (admin)

**Features:**
- Autenticação JWT obrigatória
- Validação de entrada
- Tratamento de erros
- Resposta estruturada

**Status:** ✅ Funcional

#### 1.5 Testes (ragRetrieval.test.js)
- 12 testes unitários
- Cobertura de:
  - Cálculos matemáticos
  - Embeddings
  - Filtros
  - Validações
  - Performance
- **Resultado:** 12/12 ✅

**Status:** ✅ Todos passando

#### 1.6 Documentação
- CURL_RAG_EXAMPLES.md - 10 exemplos de requisições
- README_RAG_SPRINT4.md - Arquitetura e setup
- test_rag.sh - Script de testes
- test_rag_complete.sh - Suite completa

**Status:** ✅ Completo

### Entrega Semana 1
```
✅ rag.types.js (150 linhas)
✅ rag-mock-data.js (120 linhas, 10 chunks)
✅ ragRetrieval.js (180 linhas, 4 funções)
✅ ragController.js (90 linhas, 2 endpoints)
✅ rag.js (25 linhas, rotas)
✅ ragRetrieval.test.js (350 linhas, 12 testes)
✅ CURL_RAG_EXAMPLES.md (documente de exemplos)
✅ README_RAG_SPRINT4.md (documentação completa)
```

**Status:** ✅ SEMANA 1 COMPLETA

---

## 2️⃣ SEMANA 2: Validação Local

### Objetivos
- Testar todos os casos de uso com curl
- Validar ranking e relevância
- Benchmark de performance
- Preparar para integração Pessoa A

### Tarefas

#### 2.1 Testes Funcionais (Manual)
- [ ] Teste cada exemplo em CURL_RAG_EXAMPLES.md
- [ ] Validar estrutura de respostas
- [ ] Verificar tratamento de erros
- [ ] Testar com diferentes topK (1, 5, 10, 20)

#### 2.2 Validação de Ranking
- [ ] Verificar se resultados mais relevantes estão primeiro
- [ ] Comparar scores entre queries similares
- [ ] Ajustar weights se necessário (agora: não há weights)

#### 2.3 Performance Benchmark
- [ ] Executar 100 queries e medir tempo médio
- [ ] Validar requisito: < 100ms por query
- [ ] Documentar números

**Script sugerido:**
```bash
for i in {1..100}; do
  time curl -s -X POST http://localhost:3000/api/internal/rag/search \
    -H "Authorization: Bearer $JWT" \
    -d "{\"query\": \"test query $i\", \"topK\": 5}"
done | awk '{sum+=$NF} END {print "Média: " sum/NR "ms"}'
```

#### 2.4 Prototipagem DF
- [ ] Simular respostas do RAG no chat clínico
- [ ] Validar formato de resposta é adequado
- [ ] Coletar feedback DF sobre:
  - Número de resultados ideal
  - Campos necessários na resposta
  - Formato de apresentação

#### 2.5 Documentação
- [ ] Atualizar README com números de performance
- [ ] Criar guia de troubleshooting
- [ ] Documentar padrões de consultas comuns

### Entrega Semana 2
```
✅ Relatório de testes funcionais
✅ Benchmark performance
✅ Feedback DF validado
✅ README atualizado
⏳ Pronto para dados reais da Pessoa A
```

**Bloqueador:** Pessoa A deve fornecer schema final dos chunks

---

## 3️⃣ SEMANA 3: Integração Pessoa A

### Objetivos
- Receber chunks + embeddings reais
- Adaptar sistema para dados reais
- Testes de integração
- Preparar para Vector DB

### Tarefas

#### 3.1 Alinhamento de Schema
- [ ] Receber especificação final de chunks da Pessoa A
- [ ] Validar compatibilidade com contrato rag.types.js
- [ ] Ajustar se necessário (ex: metadados adicionais)

**Expected Fields:**
```json
{
  "id": "string",
  "texto": "string",
  "embedding": "number[] (1536 para OpenAI)",
  "metadados": {
    "fonte": "string",
    "especialidade": "string",
    "tema": "string",
    "seção": "string",
    "tipo": "string",
    "timestamp": "ISO 8601",
    // Campos adicionais da Pessoa A?
  }
}
```

#### 3.2 Adaptar Dimensionalidade
- [ ] Mock atual: 768 dimensões
- [ ] Real esperado: 1536 (OpenAI) ou outro?
- [ ] Validar cosineSimilarity continua funcionando
- [ ] Testar performance com dimensionalidade real

#### 3.3 Importar Dados Reais
- [ ] Criar script de importação (PostgreSQL ou memória)
- [ ] Carregar chunks da Pessoa A
- [ ] Validar integridade dos dados
- [ ] Testes com dados reais

**Possível estrutura:**
```javascript
// Importar chunks reais
const chunks = await importChunksFromPersonaA();
const resultado = semanticSearch(query, chunks, topK);
```

#### 3.4 Testes de Integração
- [ ] Busca com dados reais funciona
- [ ] Ranking está correto
- [ ] Performance continua < 100ms
- [ ] Filtros funcionam com dados reais

#### 3.5 Criar Adapter Genérico
- [ ] Preparar código para trocar data source facilmente
- [ ] Isolar mock de dados reais
- [ ] Versionar ambos (mock, staging, prod)

**Sugerido:**
```javascript
// ragRetrieval.js
const chunks = process.env.USE_MOCK === 'true' 
  ? MOCK_CHUNKS 
  : await loadChunksFromVectorDB();

const result = semanticSearch(query, chunks, topK);
```

### Entrega Semana 3
```
✅ Schema alinhado com Pessoa A
✅ Embeddings com dimensão correta
✅ Dados reais importados
✅ Testes passando com dados reais
✅ Adapter genérico implementado
⏳ Pronto para Vector DB
```

**Bloqueador:** Pessoa A deve entregar dados no formato acordado

---

## 4️⃣ SEMANA 4: Vector DB & Deploy

### Objetivos
- Integrar com Pinecone (provisionado por DBB)
- Testes de carga
- Deploy staging
- Integração final DF

### Tarefas

#### 4.1 Setup Pinecone
- [ ] Receber credenciais da DBB
  - `PINECONE_API_KEY`
  - `PINECONE_ENVIRONMENT`
  - `PINECONE_INDEX`
- [ ] Validar conectividade
- [ ] Testar operações básicas (insert, query)

#### 4.2 Implementar Adapter Pinecone
- [ ] Criar `pineconeAdapter.js`
- [ ] Implementar:
  - Query por similaridade
  - Filtros por metadados
  - Upsert de chunks
  - Delete de chunks

**Exemplo:**
```javascript
// pineconeAdapter.js
const { Pinecone } = require('@pinecone-database/pinecone');

async function searchPinecone(query, embedding, topK) {
  const results = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
    filter: { /* metadados */ }
  });
  return results.matches;
}
```

#### 4.3 Migrar Dados para Vector DB
- [ ] Fazer upload de todos os chunks
- [ ] Validar integridade
- [ ] Testar búsca em Pinecone

#### 4.4 Integração com Embedding Real
- [ ] Trocar generateQueryEmbedding() por modelo real
- [ ] Usar modelo openai/huggingface?
- [ ] Testar busca com embedding real

**Sugerido:**
```javascript
async function generateQueryEmbedding(query) {
  // Mock -> Real
  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: query
  });
  return response.data[0].embedding;
}
```

#### 4.5 Testes de Carga
- [ ] Testar 100 queries simultâneas
- [ ] Validar performance continua < 100ms
- [ ] Testar rate limiting
- [ ] Monitorar uso de créditos Pinecone

**Script:**
```bash
ab -n 1000 -c 100 -p data.json http://localhost:3000/api/internal/rag/search
```

#### 4.6 Integração DF
- [ ] Conectar chat clínico ao endpoint RAG
- [ ] Testar fluxo completo
- [ ] Coletar feedback de UX
- [ ] Ajustar conforme necessário

#### 4.7 Deploy Staging
- [ ] Deploy em ambiente staging
- [ ] Validação final
- [ ] Monitoramento
- [ ] Pronto para produção

### Entrega Semana 4
```
✅ Pinecone conectado e funcionando
✅ Dados migraram do mock para VectorDB
✅ Embeddings usando modelo real
✅ Testes de carga passando
✅ Integração DF completa
✅ Deploy staging validado
✅ Pronto para produção
```

**Bloqueador:** DBB deve provisionar Pinecone

---

## 📊 Resumo de Dependências

| Item | Responsável | Quando | Status |
|------|-------------|--------|--------|
| JWT Token válido | DevOps/Admin | Semana 1 | ✅ |
| Schema chunks | Pessoa A | Semana 3 | ⏳ |
| Dados mock | Pessoa B | Semana 1 | ✅ |
| Embeddings reais | Pessoa A | Semana 3 | ⏳ |
| Credenciais Pinecone | DBB | Semana 4 | ⏳ |
| Integração DF | DF Team | Semana 4 | ⏳ |

---

## 🚀 Como Acompanhar Progresso

### Métricas de Sucesso

**Semana 1:** ✅ COMPLETA
- Lógica funcionando (12/12 testes)
- Documentação pronta
- Endpoints HTTP operacionais

**Semana 2:** ✅ VALIDAÇÃO
- 100% requisições com sucesso
- Performance < 100ms (média)
- Feedback DF positivo

**Semana 3:** ✅ INTEGRAÇÃO
- Dados reais importados
- Testes passando com dados reais
- Ranking validado

**Semana 4:** ✅ PRODUÇÃO
- Vector DB ativo
- Testes de carga OK
- Deploy staging verificado

---

## 📋 Checklist Final

- [ ] Semana 1: Todos os testes passam
- [ ] Semana 1: Documentação completa
- [ ] Semana 2: Performance benchmark OK
- [ ] Semana 2: Feedback DF coletado
- [ ] Semana 3: Dados reais importados
- [ ] Semana 3: Integração Pessoa A OK
- [ ] Semana 4: Pinecone conectado
- [ ] Semana 4: Embeddings reais funcionam
- [ ] Semana 4: Testes de carga OK
- [ ] Semana 4: DF integrado
- [ ] Semana 4: Deploy staging validado

---

## 🎯 Próximos Passos Imediatos (Semana 2)

1. **Hoje (Semana 1 - Dia 5):**
   - ✅ Implementação concluída
   - ✅ Testes passando
   - ✅ Documentação pronta

2. **Amanhã (Semana 2 - Dia 1):**
   - [ ] Executar CURL_RAG_EXAMPLES.md completo
   - [ ] Validar estrutura de respostas
   - [ ] Preparar relatório para Pessoa A

3. **Semana 2:**
   - [ ] Benchmarks completos
   - [ ] Feedback DF coletado
   - [ ] Ajustes menores conforme feedback

---

**Status Atual:** ✅ **SEMANA 1 COMPLETA - PRONTO PARA SEMANA 2**

Pessoa B, você tem a base sólida. Semana 2 é validação e preparação. Semana 3 integra com Pessoa A, Semana 4 conecta ao Pinecone real. 

💪 Continue assim!
