#!/bin/bash

# test_rag_endpoints.sh
# Script para testar endpoints do RAG (Retrieval-Augmented Generation)
# Uso: bash test_rag_endpoints.sh <JWT_TOKEN> [base_url]

set -e

# Configurações
JWT_TOKEN="${1:-}"
BASE_URL="${2:-http://localhost:3000}"
API_ENDPOINT="$BASE_URL/api/internal/rag"

# Cores para saída
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validação
if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}❌ Erro: JWT_TOKEN é obrigatório${NC}"
  echo "Uso: bash test_rag_endpoints.sh <JWT_TOKEN> [base_url]"
  exit 1
fi

echo -e "${YELLOW}🔍 Testando endpoints RAG${NC}"
echo "Base URL: $BASE_URL"
echo "---"

# Teste 1: Busca simples
echo -e "${YELLOW}Teste 1: Busca simples (Pré-eclâmpsia)${NC}"
RESPONSE=$(curl -s -X POST "$API_ENDPOINT/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "Como detectar pré-eclâmpsia?",
    "topK": 3
  }')
echo "$RESPONSE" | jq '.'
echo ""

# Teste 2: Busca com filtro de especialidade
echo -e "${YELLOW}Teste 2: Busca com filtro de especialidade (Obstetrícia)${NC}"
RESPONSE=$(curl -s -X POST "$API_ENDPOINT/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "Crescimento fetal",
    "especialidade": "Obstetrícia",
    "topK": 2
  }')
echo "$RESPONSE" | jq '.'
echo ""

# Teste 3: Busca com filtro de fonte
echo -e "${YELLOW}Teste 3: Busca com filtro de fonte (FEBRASGO)${NC}"
RESPONSE=$(curl -s -X POST "$API_ENDPOINT/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "Hemoglobina gestacional",
    "fonte": "FEBRASGO",
    "topK": 2
  }')
echo "$RESPONSE" | jq '.'
echo ""

# Teste 4: Busca com múltiplos filtros
echo -e "${YELLOW}Teste 4: Busca com múltiplos filtros${NC}"
RESPONSE=$(curl -s -X POST "$API_ENDPOINT/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "Ultrassonografia",
    "especialidade": "Radiologia",
    "fonte": "FEBRASGO",
    "topK": 2
  }')
echo "$RESPONSE" | jq '.'
echo ""

# Teste 5: Busca com topK maior
echo -e "${YELLOW}Teste 5: Busca com topK=5${NC}"
RESPONSE=$(curl -s -X POST "$API_ENDPOINT/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "Infecção gestação",
    "topK": 5
  }')
echo "$RESPONSE" | jq '.resultados | length'
echo ""

# Teste 6: Estatísticas (admin only)
echo -e "${YELLOW}Teste 6: Obter estatísticas do RAG (requer admin)${NC}"
RESPONSE=$(curl -s -X GET "$API_ENDPOINT/stats" \
  -H "Authorization: Bearer $JWT_TOKEN")
echo "$RESPONSE" | jq '.'
echo ""

# Teste 7: Erro - Query vazia
echo -e "${YELLOW}Teste 7: Erro esperado - Query vazia${NC}"
RESPONSE=$(curl -s -X POST "$API_ENDPOINT/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "",
    "topK": 5
  }')
echo "$RESPONSE" | jq '.'
echo ""

# Teste 8: Erro - topK inválido
echo -e "${YELLOW}Teste 8: Erro esperado - topK fora do range${NC}"
RESPONSE=$(curl -s -X POST "$API_ENDPOINT/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "qualquer coisa",
    "topK": 25
  }')
echo "$RESPONSE" | jq '.'
echo ""

echo -e "${GREEN}✅ Testes concluídos!${NC}"
