#!/bin/bash
API_URL="http://localhost:3000/api"

divider() { echo -e "\n==============================\n$1\n=============================="; }

# Criar usuário
divider "Criando usuário..."
USER_PAYLOAD=$(cat <<EOF
{
  "name": "Maria",
  "email": "maria$(date +%s)@example.com",
  "password": "123456",
  "birthdate": "1995-07-15"
}
EOF
)
USER_RESPONSE=$(curl -s -X POST "$API_URL/users" -H "Content-Type: application/json" -d "$USER_PAYLOAD")
USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✅ Usuário criado: $USER_RESPONSE"

# Criar gestante
divider "Criando gestante..."
PREGNANT_PAYLOAD=$(cat <<EOF
{
  "user_id": $USER_ID
}
EOF
)
PREGNANT_RESPONSE=$(curl -s -X POST "$API_URL/pregnants" -H "Content-Type: application/json" -d "$PREGNANT_PAYLOAD")
PREGNANT_ID=$(echo "$PREGNANT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✅ Gestante criada: $PREGNANT_RESPONSE"

# Criar gravidez
divider "Criando gravidez..."
PREGNANCY_PAYLOAD=$(cat <<EOF
{
  "pregnant_id": $PREGNANT_ID,
  "dum": "2025-02-01",
  "dpp": "2025-11-01",
  "ig_ultrassonografia": "2025-02-15",
  "weeks": 10,
  "is_checked": false,
  "ccn": 0.0,
  "dgm": 0.0,
  "glicemia": 87.5,
  "frequencia_cardiaca": 110,
  "regularidade_do_ciclo": true
}
EOF
)
PREGNANCY_RESPONSE=$(curl -s -X POST "$API_URL/pregnancies" -H "Content-Type: application/json" -d "$PREGNANCY_PAYLOAD")
PREGNANCY_ID=$(echo "$PREGNANCY_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✅ Gravidez criada: $PREGNANCY_RESPONSE"

# Criar evento da gravidez
divider "Criando evento..."
EVENT_PAYLOAD=$(cat <<EOF
{
  "pregnancy_id": $PREGNANCY_ID,
  "descricao": "Primeiro ultrassom",
  "data_evento": "2025-03-01"
}
EOF
)
EVENT_RESPONSE=$(curl -s -X POST "$API_URL/pregnancyEvents" -H "Content-Type: application/json" -d "$EVENT_PAYLOAD")
EVENT_ID=$(echo "$EVENT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✅ Evento criado: $EVENT_RESPONSE"

# Fazer upload de documento
divider "Fazendo upload de documento..."
touch teste_documento.txt
echo "Documento fictício da gestante" > teste_documento.txt

DOC_RESPONSE=$(curl -s -X POST "$API_URL/documents" \
  -F "pregnant_id=$PREGNANT_ID" \
  -F "document_name=Ultrassom Inicial" \
  -F "document_type=pdf" \
  -F "document=@teste_documento.txt"   # <-- 'file' aqui precisa bater com upload.single('file')
echo "✅ Documento enviado: $DOC_RESPONSE"


# Resultado final
divider "Resumo Final"
echo "👤 Usuário ID: $USER_ID"
echo "🤰 Gestante ID: $PREGNANT_ID"
echo "🍼 Gravidez ID: $PREGNANCY_ID"
echo "📅 Evento ID: $EVENT_ID"
