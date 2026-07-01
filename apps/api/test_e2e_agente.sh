#!/bin/bash

# Removemos o cd se você já estiver na pasta da API ou usamos caminhos relativos
# Apenas certifique-se de executar este script a partir da raiz ou de onde os caminhos funcionam.

echo "🔑 Gerando token JWT de teste..."
# Ajuste o caminho se necessário. Se você estiver na raiz, use apps/api/scripts/...
JWT_TOKEN=$(node ./scripts/generate-jwt-test-token.js)

echo "🌱 Inserindo paciente de teste no container..."
# Captura o ID garantindo que espaços extras sejam removidos (tr)
PATIENT_ID=$(docker compose exec -T backend node ./scripts/seed_test_patient.js | grep -o '[0-9]\+' | tail -n 1)

if [ -z "$PATIENT_ID" ]; then
    echo "❌ Falha ao inserir gestante de teste (PATIENT_ID vazio)."
    exit 1
fi

echo "--- 🚀 Iniciando Teste E2E (Paciente ID: $PATIENT_ID) ---"

QUERY="A paciente apresenta cefaleia intensa. O que as diretrizes recomendam?"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:3000/api/agent/maternal-analysis" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"query\": \"$QUERY\"
  }")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Status HTTP: $HTTP_STATUS"

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✅ Teste E2E Passou!"
    echo "Resposta da IA:"
    echo "$BODY"
else
    echo "❌ Teste E2E Falhou (Status: $HTTP_STATUS)"
    echo "$BODY"
fi

# --- Limpeza de Dados (Teardown) ---
echo "A limpar dados de teste da base de dados..."

# Apaga o User associado à Gestante criada. 
# O "ON DELETE CASCADE" encarrega-se de limpar as tabelas dependentes.
docker compose exec -T db psql -U myuser -d myfetus -c "DELETE FROM users WHERE id = (SELECT user_id FROM pregnants WHERE id = $PATIENT_ID);"

echo "Gestante (ID: $PATIENT_ID) removida com sucesso."