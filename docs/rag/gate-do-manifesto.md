# Gate do manifesto na ingestão do RAG

| Campo | Valor |
| --- | --- |
| Issue | E4-02.1 — Gate do manifesto e versionamento dos PDFs (subtask da E4-02) |
| Depende de | E4-01 — [`manifesto.md`](manifesto.md) |
| Código | `apps/api/services/ragManifestGate.js` |
| Testes | `apps/api/tests/ragManifestGate.test.js` (incluído no `npm run test:ci`) |

## O que o gate faz

Antes de extrair texto ou gerar embeddings, `npm run rag:ingest` confere **cada PDF**
de `apps/api/data/guidelines/` contra o manifesto. Um PDF só é liberado quando todas as
condições abaixo são verdadeiras:

| Regra | Código do bloqueio |
| --- | --- |
| O arquivo se chama `<documentId>.pdf` e esse `documentId` existe no manifesto | `NOT_IN_MANIFEST` |
| O estado da fonte é `aprovado` | `NOT_APPROVED` |
| A aprovação tem responsável (`approval.by`) e data (`approval.date`) | `APPROVAL_INCOMPLETE` |
| A fonte tem SHA-256 registrado | `HASH_MISSING` |
| O SHA-256 do arquivo é igual ao registrado | `HASH_MISMATCH` |

**Fail closed:** se **qualquer** PDF da pasta for bloqueado, ou se nenhum for liberado,
a ingestão inteira para com erro, antes de chamar extração, embeddings ou Pinecone.
Um PDF alterado (hash diferente) só volta a ser aceito depois de o manifesto ser
atualizado e aprovado de novo.

## Fonte de verdade

| Arquivo | Para quem | Papel |
| --- | --- | --- |
| `docs/rag/manifesto.md` | Pessoas (P.O., revisão clínica, equipe) | Referência com justificativas, licenças, lacunas e registro de aprovação |
| `apps/api/data/rag-manifest.json` | Código (gate) | Mesmos dados em formato JSON. Fica dentro de `apps/api` para estar disponível também na imagem Docker da API |

Para apontar o gate para outro arquivo (ex.: em testes manuais), defina a variável
`RAG_MANIFEST_PATH`.

O teste `manifesto JSON está sincronizado com docs/rag/manifesto.md` falha se a versão
do manifesto, um `documentId` ou um SHA-256 do JSON não aparecer no Markdown.

## Metadados levados para os vetores

Só campos públicos da publicação, vindos do manifesto: `documentId`, `title`, `issuer`,
`edition`, `year`, `language`, `documentType`, `sourceUrl`, `license`, `sha256` e
`manifestVersion`. Nome e data de aprovação **não** vão para o índice. Nenhum metadado
vem do nome do arquivo nem de dados de usuário.

## Decisão de armazenamento (estado atual)

| Item | Decisão atual | Situação |
| --- | --- | --- |
| Onde ficam os PDFs para ingestão | `apps/api/data/guidelines/`, com nome `<documentId>.pdf` | Em uso |
| PDFs no Git | **Não.** `.gitignore` ignora `apps/api/data/guidelines/*.pdf` | Em uso |
| Integridade | SHA-256 do arquivo conferido contra o manifesto a cada execução | Em uso |
| Origem dos arquivos | Download manual da URL oficial registrada no manifesto | Em uso |
| Armazenamento central | Bucket privado no GCP (`rag-sources/<documentId>/<sha256>.pdf`), proposto no manifesto | **Pendente de decisão do P.O.** |
| Conteúdo permitido | Somente publicações oficiais públicas listadas no manifesto. Proibido guardar prontuários, exames, laudos ou qualquer dado real de paciente | Regra |

Enquanto o bucket não for aprovado, cada pessoa que rodar a ingestão baixa os PDFs
das URLs do manifesto. O hash garante que todos ingerem exatamente o mesmo arquivo.

## Como usar

1. Baixe o PDF pela URL oficial do manifesto e salve como
   `apps/api/data/guidelines/<documentId>.pdf`.
2. Confira a pasta, sem ingerir nada:
   ```bash
   cd apps/api
   npm run rag:check
   ```
   O comando lista cada arquivo como `OK` ou `BLOQUEADO`, com o motivo, e sai com
   código 1 se a ingestão estiver bloqueada.
3. Só com tudo `OK`, rode `npm run rag:ingest`.

Hoje **todas** as fontes do manifesto estão como `proposta`. Por isso o gate bloqueia
qualquer ingestão até o P.O. aprovar ao menos uma fonte.

## Como liberar uma fonte (após decisão do P.O.)

Na mesma PR:

1. Em `docs/rag/manifesto.md`: mudar o estado para `aprovado` e preencher a linha da
   fonte no registro de aprovação (decisão, responsável, data, quem conferiu o hash).
2. Em `apps/api/data/rag-manifest.json`: mudar `state` para `"aprovado"` e preencher
   `"approval": { "by": "<responsável>", "date": "AAAA-MM-DD" }`.
3. Se o PDF mudou: atualizar `sha256`, `sizeBytes` e `accessedAt` nos dois arquivos e
   incrementar a versão do manifesto nos dois.
4. Rodar `npm run test:ci` em `apps/api`.

## Fora do escopo

Download automático dos PDFs, bucket, extração e chunking (E4-02.2), embeddings e
upsert (E4-02.3), estatísticas e rollback (E4-02.4).
