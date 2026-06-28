# API Usage — MyFetus (Backend)

Este documento descreve como usar os endpoints do backend do projeto MyFetus. Inclui exemplos `curl`, payloads esperados e observações importantes.

**Rodando a API**

- Usando Docker Compose (recomendado):

```bash
# a partir da raiz do projeto
docker compose up -d --build
# reiniciar apenas o backend após alterações de código
docker compose restart backend
```

- Variáveis de ambiente obrigatórias:
  - `PG_USER`
  - `PG_PASSWORD`
  - `PG_DATABASE`
  - `PG_HOST`
  - `PG_PORT` (default `5432`)
  - `PORT` (default `3000`)
  - `JWT_SECRET` (obrigatório para rotas autenticadas)
  - `JWT_EXPIRES_IN` (default `8h`)
  - `CORS_ORIGIN` (origens permitidas separadas por vírgula)

Base URL padrão: `http://localhost:3000/api`

Observação: o servidor expõe `/api` como prefixo de todas as rotas.

### JWT de teste

Para gerar um valor de `JWT_SECRET`, use:

```bash
npm run jwt:secret
```

Para rotacionar o segredo no `.env` local:

```bash
npm run jwt:rotate
```

O comando não imprime o novo segredo. Tokens emitidos anteriormente deixam de
ser válidos. Use `npm run jwt:rotate -- --restart` para também recriar o backend.

### JWT de teste sem rotacionar segredo

Para gerar um token válido com o `JWT_SECRET` atual do `.env`, use:

```bash
npm run jwt:test-token
```

O comando imprime apenas um JWT de `admin` para desenvolvimento local.

Use esse fluxo quando quiser apenas autenticar chamadas locais sem alterar a configuração do backend.

Se preferir usar a JWT gerada manualmente em outro request, copie o token impresso e envie no header:

```bash
Authorization: Bearer <token-gerado>
```

---

**Restrições e observações**

- Campo `role` em `users` aceita apenas: `gestante`, `medico`, `admin`.
- Uploads de documentos usam `multer` e salvam arquivos em `uploads/`.
- O script de testes está em `apps/api/test_api.sh` e verifica os principais endpoints.
- O comando `npm run jwt:test-token` usa o `JWT_SECRET` do `.env` sem rotacioná-lo.

---

## Endpoints principais

Todos os exemplos usam `curl`. Substitua `localhost:3000` se necessário.

### Users

- Criar usuário
  - POST `/api/users`
  - JSON: `name`, `email`, `password`, `birthdate` (YYYY-MM-DD), `is_active` (boolean), `role` (`gestante|medico|admin`)

Exemplo:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"João","email":"joao@example.com","password":"senha123","birthdate":"1990-05-15","role":"gestante"}'
```

- Listar usuários: GET `/api/users`
- Buscar por id: GET `/api/users/:id`
- Atualizar: PUT `/api/users/:id` (envia JSON com campos a alterar; se `password` será criptografada)
- Deletar: DELETE `/api/users/:id`
- Login: POST `/api/users/login` — body: `{ "email": "...", "password": "..." }`

---

### Pregnants (gestantes)

- Criar gestante: POST `/api/pregnants`
  - JSON: `{ "user_id": <userId> }`

Exemplo:

```bash
curl -X POST http://localhost:3000/api/pregnants \
  -H "Content-Type: application/json" \
  -d '{"user_id":4}'
```

- Listar: GET `/api/pregnants`
- Consultar por id: GET `/api/pregnants/:id`
- Atualizar: PUT `/api/pregnants/:id` (envia JSON com os campos suportados — ex.: `altura`, `peso_atual`, `pressao_sistole`, etc.)

Observação: a listagem de gestantes faz JOIN com `users` e filtra por `role = 'user'` (comportamento implementado no controller).

---

### Pregnancies (gestações)

Todas as rotas exigem `Authorization: Bearer <token>`.
Listagem e criação respeitam o acesso da gestante ao próprio registro, do médico às gestantes vinculadas, e do admin a todas.

- Criar: POST `/api/pregnancies`
  - JSON obrigatório: `pregnant_id`, `dum`, `dpp`, `ig_ultrassonografia` + outros campos opcionais (`weeks`, `glicemia`, `frequencia_cardiaca`, ...)

Exemplo:

```bash
curl -X POST http://localhost:3000/api/pregnancies \
  -H "Content-Type: application/json" \
  -d '{"pregnant_id":4,"weeks":10,"dum":"2025-02-01","dpp":"2025-11-01","ig_ultrassonografia":"2025-02-15"}'
```

- Listar: GET `/api/pregnancies`
- Atualizar: PUT `/api/pregnancies/:id` (`medico` ou `admin`; envia campos a alterar: `glicemia`, `frequencia_cardiaca`, `altura_uterina`, ...)

---

### Pregnancy Events (eventos da gestação)

Todas as rotas exigem `Authorization: Bearer <token>`.
Criação e atualização são permitidas para `medico` vinculado ou `admin`; consulta também permite a própria `gestante`.

- Criar: POST `/api/pregnancyEvents`
  - JSON: `{ "pregnancy_id": <id>, "descricao": "...", "data_evento": "YYYY-MM-DD" }`
- Listar por gravidez: GET `/api/pregnancyEvents?pregnancy_id=<id>`
- Atualizar: PUT `/api/pregnancyEvents/:id`

Exemplo de criação:

```bash
curl -X POST http://localhost:3000/api/pregnancyEvents \
  -H "Content-Type: application/json" \
  -d '{"pregnancy_id":2,"descricao":"Ultrassom","data_evento":"2025-03-01"}'
```

---

### Documents (documentos da gestante)

Todas as rotas exigem `Authorization: Bearer <token>` de usuário `medico` ou `admin`.
Médicos só acessam documentos de gestantes vinculadas em `doctor_patient_links`.

- Upload (multipart): POST `/api/documents`
  - Form fields: `pregnant_id` (number), `document_name` (string), `document_type` (string), `file` ou `document` (arquivo)

Exemplo:

```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "pregnant_id=4" \
  -F "document_name=Ultrassom Inicial" \
  -F "document_type=pdf" \
  -F "file=@/caminho/para/arquivo.pdf"
```

- Listar por `pregnant_id`: GET `/api/documents?pregnant_id=<id>`
- Consultar por id: GET `/api/documents/:id`
- Baixar arquivo: GET `/api/documents/:id/download`
- Consultar texto extraído: GET `/api/documents/:id/text`
  - Retorna `200 OK` com `extraction_status`, `extracted_text`, `extraction_method` e metadados quando `extraction_status = done`.
  - Retorna `202 Accepted` com o status atual enquanto o processamento ainda não terminou.
- Reprocessar extração: POST `/api/documents/:id/extract`
  - Enfileira o documento novamente para extração assíncrona.
- Atualizar metadados: PUT `/api/documents/:id` (JSON com `document_name` e/ou `document_type`)
- Deletar: DELETE `/api/documents/:id`

Para habilitar as colunas de extração em um banco existente, aplique:

```bash
psql -U myuser -d mydatabase -f apps/api/db/migration_extracted_text.sql
```

O backend também inicia um worker periódico a cada 30 segundos, processando até 5 documentos `pending` por ciclo. No upload, a API dispara uma tentativa assíncrona imediata sem bloquear a resposta HTTP.

---

### Medições fetais (medicoes)

Exige `Authorization: Bearer <token>` de usuário `medico` ou `admin`.

- Endpoint: POST `/api/medicoes`
  - JSON: `{ "idade_gestacional_semanas": <number>, "comp_femur_mm": <number> }`
  - A rota calcula `comp_fetal_estimado_cm = 6.18 + 0.59 * comp_femur_mm` e insere o registro na tabela `medidas_fetais`.

Exemplo:

```bash
curl -X POST http://localhost:3000/api/medicoes \
  -H "Content-Type: application/json" \
  -d '{"idade_gestacional_semanas":12,"comp_femur_mm":22}'
```

Resposta esperada: `201 Created` com mensagem e objeto da medição.

---

### Histórico clínico (biometria fetal e peso materno)

Todas as rotas exigem `Authorization: Bearer <token>`. Gestante, médico
vinculado e admin podem consultar. Apenas médico vinculado e admin podem
registrar dados.

- `GET /api/history/pregnancies/:pregnancyId`
- `GET /api/history/pregnancies/:pregnancyId/fetal-biometries`
- `POST /api/history/pregnancies/:pregnancyId/fetal-biometries`
- `GET /api/history/pregnancies/:pregnancyId/maternal-weights`
- `POST /api/history/pregnancies/:pregnancyId/maternal-weights`

As consultas aceitam `from`, `to` (`YYYY-MM-DD`), `order` (`asc|desc`) e
`limit` (1 a 500).

Payload de biometria fetal:

```json
{
  "measured_at": "2026-06-15",
  "gestational_age_weeks": 32,
  "dbp_mm": 82,
  "cc_mm": 300,
  "ca_mm": 280,
  "cf_mm": 62,
  "notes": "Ultrassom de rotina"
}
```

O backend calcula e persiste automaticamente PFE, peso mediano esperado,
percentil Hadlock e Z-score.

Payload de peso materno:

```json
{
  "measured_at": "2026-06-15",
  "weight_kg": 68.4,
  "notes": "Consulta pre-natal"
}
```

Em bancos existentes, aplique:

```bash
psql -U myuser -d mydatabase -f apps/api/db/migration_sprint6_history.sql
### Doctor Patient Links (vínculo médico-gestante)

Exige `Authorization: Bearer <token>` de usuário `medico`. É esse vínculo que controla quais
gestantes aparecem em `GET /api/pregnants` para o médico e o acesso aos dados clínicos dela
(`utils/clinicalAccess.js`).

- Buscar gestante por email: GET `/api/doctor-patient-links/search?email=<email>`
- Criar/reativar vínculo: POST `/api/doctor-patient-links`
  - JSON: `{ "pregnant_id": <number> }`
- Desativar vínculo: DELETE `/api/doctor-patient-links/:pregnantId`

Exemplo:

```bash
curl "http://localhost:3000/api/doctor-patient-links/search?email=paciente@exemplo.com" \
  -H "Authorization: Bearer <token>"

curl -X POST http://localhost:3000/api/doctor-patient-links \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"pregnant_id":3}'
```

---

### Sync (sincronização)

Exige `Authorization: Bearer <token>` de usuário `admin`.

- Endpoint: POST `/api/sync`
- Payload (exemplo simples):

```json
{
  "last_sync_timestamp": null,
  "changes": {
    "pregnants": {
      "created": [ /* registros criados no cliente */ ],
      "updated": [ /* registros atualizados no cliente */ ]
    }
  }
}
```

- Resposta: JSON com `new_sync_timestamp` e `server_changes` (registros que mudaram no servidor desde `last_sync_timestamp`).

Exemplo de curl:

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"last_sync_timestamp":null, "changes":{}}'
```

---

## Testes automatizados locais

- Existe um script de teste rápido em `apps/api/test_api.sh` que cria dados de exemplo, testa os endpoints principais e faz um resumo OK/FAIL.

Executar:

```bash
cd apps/api
bash test_api.sh
```

Ele depende do backend rodando em `http://localhost:3000` (padrão do docker compose).

---

## Dicas de depuração

- Se um endpoint retornar erro 500, verifique os logs do container backend:

```bash
docker compose logs -f backend
```

- Para aplicar alterações de código locais sem rebuild de imagem (dev): o `docker-compose.yml` monta `./apps/api:/app`, então reiniciar o container recarrega o código:

```bash
docker compose restart backend
```

---

Arquivo de referência do projeto:
- Script de teste: `apps/api/test_api.sh`
- Controllers: `apps/api/controllers/` (ver implementação das rotas)
- Esquema do banco: `apps/api/db/create_tables.sql`

## Setup local

### Gerar dataset de teste (PDFs escaneados)
```bash
node scripts/generate_dataset.js --with-ocr
```

### Baixar guidelines clínicos
```bash
# Criar a pasta e baixar manualmente os PDFs de:
# - FEBRASGO: https://...
# - ACOG: https://...
# - Manual MS: https://...
mkdir -p apps/api/data/guidelines/
```

Se os PDFs das guidelines forem de uso interno ou já tiverem URL fixa, você pode criar um script `scripts/download_guidelines.sh` que faz o download automaticamente — aí o setup fica com um único comando.
