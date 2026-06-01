#!/bin/bash

# test_rag_complete.sh
# Script completo de testes RAG com geração de JWT
# Usa tokens teste (NODE_ENV=test deve estar ativo)

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
ADMIN_USER="admin@test.com"
ADMIN_PASS="admin123secure"

echo "🚀 Iniciando suite de testes RAG"
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

# Teste C: Filtro de especialidade
echo ""
echo "Teste C: Busca com filtro - Especialidade: Obstetrícia"
curl -fsS -X POST "$BASE_URL/api/internal/rag/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": "Crescimento fetal", "especialidade": "Obstetrícia", "topK": 2}' \
  | jq -e '.resultados[].especialidade' | head -2

# Teste D: Filtro de fonte
echo ""
echo "Teste D: Busca com filtro - Fonte: FEBRASGO"
curl -fsS -X POST "$BASE_URL/api/internal/rag/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": "Hemoglobina", "fonte": "FEBRASGO"}' \
  | jq -e '.resultados[0].fonte'

# Teste E: Múltiplos filtros
echo ""
echo "Teste E: Busca com múltiplos filtros"
curl -fsS -X POST "$BASE_URL/api/internal/rag/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "Ultrassom",
    "especialidade": "Radiologia",
    "fonte": "FEBRASGO",
    "topK": 1
  }' | jq -e '.resultados[0] | {trecho: .trecho[0:50], relevancia}'

# Teste F: Estatísticas
echo ""
echo "Teste F: Estatísticas do RAG"
curl -fsS -X GET "$BASE_URL/api/internal/rag/stats" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.stats | {total_chunks, fontes, especialidades}'

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
echo "  1. Validar respostas acima"
echo "  2. Implementar testes unitários"
echo "  3. Preparar integração com Vector DB real (Pinecone)"
