#!/bin/bash

# test_rag_complete.sh
# Script completo de testes RAG com geração de JWT (Atualizado para Pinecone - Sprint 4)
# Usa tokens teste (NODE_ENV=test deve estar ativo)

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
ADMIN_USER="admin@test.com"
ADMIN_PASS="admin123secure"

echo "🚀 Iniciando suite de testes RAG (Pinecone Integration)"
echo "Base URL: $BASE_URL"
echo "---"

# Passo 1: Gerar JWT automaticamente a partir do segredo atual do docker-compose.yml
echo "📝 Gerando JWT token automaticamente via npm run jwt:test-token..."

JWT_TOKEN=$(npm run jwt:test-token 2>/dev/null | awk '/JWT de teste gerado:/{getline; print; exit}')

if [ -z "$JWT_TOKEN" ]; then
  echo "⚠️  Aviso: JWT_TOKEN não pode ser obtido automaticamente"
  echo "   Verifique se o script npm run jwt:test-token está funcionando."
  exit 1
fi

echo "✓ JWT token pronto (primeiros 20 caracteres: ${JWT_TOKEN:0:20}...)"
echo "---"

# Passo 2: Testes funcionais
echo "🧪 Executando testes..."

# Teste A: Health check
echo ""
echo "Teste A: Health check (GET /ping)"
curl -fsS "$BASE_URL/ping" | jq -e '.' >/dev/null
curl -fsS "$BASE_URL/ping" | jq '.'

# Teste B: Busca simples
echo ""
echo "Teste B: Busca simples - 'Pré-eclâmpsia'"
curl -fsS -X POST "$BASE_URL/api/internal/rag/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": "Como detectar pré-eclâmpsia?", "topK": 3}' | jq -e '.resultados[0:2]'

# Teste C: Filtro de Tipo de Documento
echo ""
echo "Teste C: Busca com filtro - Tipo de Documento: Guideline"
curl -fsS -X POST "$BASE_URL/api/internal/rag/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": "Preeclampsia", "filtros": {"documentType": "guideline"}, "topK": 2}' \
  | jq -e '.resultados[].fonte' | head -2

# Teste D: Filtro de ID do Documento
echo ""
echo "Teste D: Busca com filtro - Documento ID: ACOG 222"
curl -fsS -X POST "$BASE_URL/api/internal/rag/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": "Hypertension", "filtros": {"documentId": "acog-gestational-hypertension-preeclampsia-2020"}}' \
  | jq -e '.resultados[0].documento_id'

# Teste E: Múltiplos filtros
echo ""
echo "Teste E: Busca com múltiplos filtros"
curl -fsS -X POST "$BASE_URL/api/internal/rag/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "Critérios diagnósticos",
    "filtros": {
      "documentType": "guideline",
      "documentId": "acog-gestational-hypertension-preeclampsia-2020"
    },
    "topK": 1
  }' | jq -e '.resultados[0] | {trecho: .trecho[0:50], relevancia, fonte}'

# Teste F: Estatísticas (Pinecone)
echo ""
echo "Teste F: Estatísticas do RAG (Pinecone)"
curl -fsS -X GET "$BASE_URL/api/internal/rag/stats" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.stats | {totalRecordCount, dimension}'

# Teste G: Validações (erros esperados)
echo ""
echo "Teste G: Validação - Query vazia (erro esperado)"
curl -sS -X POST "$BASE_URL/api/internal/rag/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": "", "topK": 5}' | jq -e '.error' >/dev/null

echo ""
echo "Teste H: Validação - topK fora do range (erro esperado)"
curl -sS -X POST "$BASE_URL/api/internal/rag/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": "teste", "topK": 50}' | jq -e '.error' >/dev/null

echo ""
echo "---"
echo "✅ Suite de testes concluída!"
echo ""
echo "📋 Próximos passos:"
echo "  1. Validar respostas acima (Verificar se a pontuação da similaridade reflete dados reais)"
echo "  2. Checar integridade dos metadados no console do Pinecone"
echo "  3. Integrar retorno estruturado na interface do Chat Clínico Mobile"