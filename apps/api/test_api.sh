#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000/api}"
ROOT_URL="${ROOT_URL:-http://localhost:3000}"
DOCUMENTS_URL="${DOCUMENTS_URL:-$API_URL/documents/documents}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

divider() {
  :
}

json_post() {
  local url="$1"
  local payload="$2"
  local body_file status
  body_file="$(mktemp)"
  status="$(curl -sS -o "$body_file" -w '%{http_code}' -X POST "$url" -H "Content-Type: application/json" -d "$payload")"
  cat "$body_file"
  rm -f "$body_file"
  printf '\n%s' "$status"
}

json_put() {
  local url="$1"
  local payload="$2"
  local body_file status
  body_file="$(mktemp)"
  status="$(curl -sS -o "$body_file" -w '%{http_code}' -X PUT "$url" -H "Content-Type: application/json" -d "$payload")"
  cat "$body_file"
  rm -f "$body_file"
  printf '\n%s' "$status"
}

json_get() {
  local url="$1"
  local body_file status
  body_file="$(mktemp)"
  status="$(curl -sS -o "$body_file" -w '%{http_code}' "$url")"
  cat "$body_file"
  rm -f "$body_file"
  printf '\n%s' "$status"
}

json_delete() {
  local url="$1"
  local body_file status
  body_file="$(mktemp)"
  status="$(curl -sS -o "$body_file" -w '%{http_code}' -X DELETE "$url")"
  cat "$body_file"
  rm -f "$body_file"
  printf '\n%s' "$status"
}

multipart_post() {
  local url="$1"
  local pregnant_id="$2"
  local document_name="$3"
  local document_type="$4"
  local file_path="$5"
  local body_file status
  body_file="$(mktemp)"
  status="$(curl -sS -o "$body_file" -w '%{http_code}' -X POST "$url" \
    -F "pregnant_id=$pregnant_id" \
    -F "document_name=$document_name" \
    -F "document_type=$document_type" \
    -F "document=@$file_path")"
  cat "$body_file"
  rm -f "$body_file"
  printf '\n%s' "$status"
}

extract_id() {
  echo "$1" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n1
}

expect_id() {
  local label="$1"
  local response="$2"
  local id
  id="$(extract_id "$response")"
  if [[ -z "$id" ]]; then
    echo "Falha ao obter ID em: $label"
    echo "$response"
    exit 1
  fi
  echo "$id"
}

check() {
  local label="$1"
  local response="$2"
  local expected="$3"
  local status
  status="${response##*$'\n'}"
  if [[ "$status" == "$expected" ]]; then
    printf 'OK: %s\n' "$label"
  else
    printf 'FAIL: %s (%s, esperado %s)\n' "$label" "$status" "$expected"
    FAILURES=$((FAILURES + 1))
  fi
}

FAILURES=0

divider "Teste de saúde"
PING_RESPONSE="$(json_get "$ROOT_URL/ping")"
check "ping" "$PING_RESPONSE" 200

divider "Criando usuário"
USER_EMAIL="teste.api.$(date +%s)@example.com"
USER_PAYLOAD=$(cat <<EOF
{
  "name": "Usuário API",
  "email": "$USER_EMAIL",
  "password": "123456",
  "birthdate": "1995-07-15",
  "is_active": true,
  "role": "medico"
}
EOF
)
USER_RESPONSE="$(json_post "$API_URL/users" "$USER_PAYLOAD")"
USER_ID="$(expect_id "criação de usuário" "$USER_RESPONSE")"
check "criação de usuário" "$USER_RESPONSE" 201

divider "Criando usuário descartável para DELETE"
DELETE_USER_EMAIL="delete.api.$(date +%s)@example.com"
DELETE_USER_PAYLOAD=$(cat <<EOF
{
  "name": "Usuário Deletável",
  "email": "$DELETE_USER_EMAIL",
  "password": "123456",
  "birthdate": "1990-01-01",
  "is_active": true,
  "role": "admin"
}
EOF
)
DELETE_USER_RESPONSE="$(json_post "$API_URL/users" "$DELETE_USER_PAYLOAD")"
DELETE_USER_ID="$(expect_id "criação de usuário deletável" "$DELETE_USER_RESPONSE")"
check "criação de usuário descartável" "$DELETE_USER_RESPONSE" 201

divider "Listando usuários"
check "listagem de usuários" "$(json_get "$API_URL/users")" 200

divider "Consultando usuário por ID"
check "consulta de usuário" "$(json_get "$API_URL/users/$USER_ID")" 200

divider "Atualizando usuário"
USER_UPDATE_PAYLOAD=$(cat <<EOF
{
  "name": "Usuário API Atualizado"
}
EOF
)
check "atualização de usuário" "$(json_put "$API_URL/users/$USER_ID" "$USER_UPDATE_PAYLOAD")" 200

divider "Testando login"
LOGIN_PAYLOAD=$(cat <<EOF
{
  "email": "$USER_EMAIL",
  "password": "123456"
}
EOF
)
check "login" "$(json_post "$API_URL/users/login" "$LOGIN_PAYLOAD")" 200

divider "Excluindo usuário descartável"
check "exclusão de usuário descartável" "$(json_delete "$API_URL/users/$DELETE_USER_ID")" 200

divider "Criando gestante"
PREGNANT_PAYLOAD=$(cat <<EOF
{
  "user_id": $USER_ID
}
EOF
)
PREGNANT_RESPONSE="$(json_post "$API_URL/pregnants" "$PREGNANT_PAYLOAD")"
PREGNANT_ID="$(expect_id "criação de gestante" "$PREGNANT_RESPONSE")"
check "criação de gestante" "$PREGNANT_RESPONSE" 201

divider "Listando gestantes"
check "listagem de gestantes" "$(json_get "$API_URL/pregnants")" 200

divider "Consultando gestante por ID"
check "consulta de gestante" "$(json_get "$API_URL/pregnants/$PREGNANT_ID")" 200

divider "Atualizando gestante"
PREGNANT_UPDATE_PAYLOAD=$(cat <<EOF
{
  "altura": 165,
  "peso_pregestacional": 74.5,
  "peso_atual": 76.2,
  "temperatura_materna": 36.6,
  "pressao_sistole": 120,
  "pressao_diastole": 80
}
EOF
)
check "atualização de gestante" "$(json_put "$API_URL/pregnants/$PREGNANT_ID" "$PREGNANT_UPDATE_PAYLOAD")" 200

divider "Criando gravidez"
PREGNANCY_PAYLOAD=$(cat <<EOF
{
  "pregnant_id": $PREGNANT_ID,
  "weeks": 10,
  "is_checked": false,
  "dum": "2025-02-01",
  "dpp": "2025-11-01",
  "ccn": 0,
  "dgm": 0,
  "glicemia": 87.5,
  "frequencia_cardiaca": 110,
  "altura_uterina": 12,
  "regularidade_do_ciclo": true,
  "ig_ultrassonografia": "2025-02-15"
}
EOF
)
PREGNANCY_RESPONSE="$(json_post "$API_URL/pregnancies" "$PREGNANCY_PAYLOAD")"
PREGNANCY_ID="$(expect_id "criação de gravidez" "$PREGNANCY_RESPONSE")"
check "criação de gravidez" "$PREGNANCY_RESPONSE" 201

divider "Listando gestações"
check "listagem de gestações" "$(json_get "$API_URL/pregnancies")" 200

divider "Atualizando gravidez"
PREGNANCY_UPDATE_PAYLOAD=$(cat <<EOF
{
  "glicemia": 90,
  "frequencia_cardiaca": 112,
  "altura_uterina": 13
}
EOF
)
check "atualização de gravidez" "$(json_put "$API_URL/pregnancies/$PREGNANCY_ID" "$PREGNANCY_UPDATE_PAYLOAD")" 200

divider "Criando evento"
EVENT_PAYLOAD=$(cat <<EOF
{
  "pregnancy_id": $PREGNANCY_ID,
  "descricao": "Primeiro ultrassom",
  "data_evento": "2025-03-01"
}
EOF
)
EVENT_RESPONSE="$(json_post "$API_URL/pregnancyEvents" "$EVENT_PAYLOAD")"
EVENT_ID="$(expect_id "criação de evento" "$EVENT_RESPONSE")"
check "criação de evento" "$EVENT_RESPONSE" 201

divider "Listando eventos"
check "listagem de eventos" "$(json_get "$API_URL/pregnancyEvents?pregnancy_id=$PREGNANCY_ID")" 200

divider "Atualizando evento"
EVENT_UPDATE_PAYLOAD=$(cat <<EOF
{
  "descricao": "Ultrassom de controle"
}
EOF
)
check "atualização de evento" "$(json_put "$API_URL/pregnancyEvents/$EVENT_ID" "$EVENT_UPDATE_PAYLOAD")" 200

divider "Criando documento"
DOC_FILE="$TMP_DIR/documento-teste.txt"
printf 'Documento fictício para teste de upload.\n' > "$DOC_FILE"
DOC_RESPONSE="$(multipart_post "$DOCUMENTS_URL" "$PREGNANT_ID" "Ultrassom Inicial" "pdf" "$DOC_FILE")"
DOC_ID="$(expect_id "criação de documento" "$DOC_RESPONSE")"
check "criação de documento" "$DOC_RESPONSE" 201

divider "Listando documentos"
check "listagem de documentos" "$(json_get "$DOCUMENTS_URL?pregnant_id=$PREGNANT_ID")" 200

divider "Consultando documento por ID"
check "consulta de documento" "$(json_get "$DOCUMENTS_URL/$DOC_ID")" 200

divider "Atualizando documento"
DOC_UPDATE_PAYLOAD=$(cat <<EOF
{
  "document_name": "Ultrassom Inicial Atualizado"
}
EOF
)
check "atualização de documento" "$(json_put "$DOCUMENTS_URL/$DOC_ID" "$DOC_UPDATE_PAYLOAD")" 200

divider "Registrando medição fetal"
MEDICAO_PAYLOAD=$(cat <<EOF
{
  "idade_gestacional_semanas": 12,
  "comp_femur_mm": 22
}
EOF
)
check "medição fetal" "$(json_post "$API_URL/medicoes" "$MEDICAO_PAYLOAD")" 201

divider "Testando sincronização"
SYNC_PAYLOAD=$(cat <<EOF
{
  "last_sync_timestamp": null,
  "changes": {
    "pregnants": {
      "created": [],
      "updated": [
        {
          "id": $PREGNANT_ID,
          "peso_atual": 77.1
        }
      ]
    }
  }
}
EOF
)

check "sincronização" "$(json_post "$API_URL/sync" "$SYNC_PAYLOAD")" 200

divider "Limpando dados criados"
check "remoção de documento" "$(json_delete "$DOCUMENTS_URL/$DOC_ID")" 200
if [[ "$FAILURES" -eq 0 ]]; then
  printf 'OK: todos os pontos principais estão funcionando\n'
else
  printf 'FAIL: %s ponto(s) não funcionaram\n' "$FAILURES"
fi
