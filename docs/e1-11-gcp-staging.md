# E1-11: homologacao no Google Cloud

O runbook completo de CI/CD, deploy, migrations, smoke tests, segurança, custo e rollback está em [`docs/ci-cd-gcp-staging.md`](ci-cd-gcp-staging.md).

## Escopo inicial de baixo custo

O ambiente de homologacao usa Cloud Run para a API, Cloud SQL PostgreSQL,
Secret Manager e Artifact Registry. O worker de documentos e o Cloud Storage
ficam fora do primeiro deploy ate que o armazenamento de arquivos seja
adaptado para objetos persistentes.

Configuracao atual:

- Projeto: `agile-extension-510310-p8`
- Regiao: `southamerica-east1`
- Servico: `myfetus-api-staging`
- Repositorio Docker: `myfetus`
- Instancia PostgreSQL: `myfetus-staging-db`
- Service account de runtime: `myfetus-api-runtime`

## Imagem de producao

O `apps/api/Dockerfile` executa `npm start`, usa `NODE_ENV=production` e roda
como o usuario nao-root `app` (UID 10001). O contexto de build deve ser
`apps/api`, para que `apps/api/.dockerignore` exclua `node_modules`, testes,
uploads e arquivos locais.

```bash
IMAGE="southamerica-east1-docker.pkg.dev/${PROJECT_ID}/myfetus/api:${GIT_SHA}"
docker build -f apps/api/Dockerfile -t "$IMAGE" apps/api
docker push "$IMAGE"
```

## Migracoes

`npm run db:migrate:cloud` executa as migrations diretamente com o driver
PostgreSQL. Cada arquivo roda em uma transacao e e registrado em
`schema_migrations`; um advisory lock impede duas execucoes simultaneas.

O comando pode ser executado em um Cloud Run Job com as mesmas variaveis
`PG_*` da API. O job deve ser concluido antes de direcionar trafego para uma
nova revisao do servico.

```bash
npm run db:migrate:cloud
```

## Configuracao de secrets

Os seguintes nomes devem existir no Secret Manager:

- `PG_PASSWORD`
- `JWT_SECRET`
- `AES_ENCRYPTION_KEY_V1`
- `EMAIL_LOOKUP_HMAC_KEY`

Nao versionar valores desses secrets no repositorio. O Cloud Run deve receber
as versoes por `--set-secrets` e a service account deve ter somente acesso de
leitura a eles.

## Limites da primeira homologacao

- `ENFORCE_HTTPS=true` e `TRUST_PROXY=1`.
- `min instances=0` no Cloud Run.
- Cloud SQL em zona unica, sem replicas.
- Nenhum dado real de paciente.
- Upload e extracao de documentos desativados ate a integracao com Cloud
  Storage privado.
