# Runbook Operacional: Rotação de Segredos e Limpeza de Uploads (E7-08)

Este runbook documenta os procedimentos operacionais para a execução segura e idempotente da rotação de credenciais criptográficas (JWT e AES-256-GCM) e da higienização do armazenamento de uploads, atendendo aos requisitos de segurança e conformidade da **LGPD** e da Resolução **CFM nº 1.821/2007**.

---

## 1. Matriz de Políticas de Retenção

| Categoria | Local de Armazenamento | Prazo de Retenção | Base Legal / Regulatória | Ação ao Fim do Prazo |
| :--- | :--- | :--- | :--- | :--- |
| **Prontuários e Exames** | PostgreSQL (`pregnant_documents`) e disco (`uploads/encrypted/*.mfe`) | **20 anos** a partir do último registro | CFM nº 1.821/2007 e Lei nº 13.787/2018 | Expurgo com aprovação médica/comitê |
| **Quarentena de Uploads** | `uploads/.quarantine/<timestamp>/` | **7 dias** | Procedimento Operacional E7-08 | Expurgo definitivo via `--purge-quarantine-older-than-days=7` |
| **Arquivos em Trânsito** | `uploads/` (temporários do `multer`) | **24 horas** (*Grace Period*) | Procedimento Operacional E7-08 | Movimentação para quarentena se órfãos |
| **Trilha de Auditoria** | PostgreSQL (`audit_logs`) | **5 anos** | LGPD (Art. 16) e Marco Civil da Internet | Arquivamento em cold storage |
| **Vetores Semânticos** | Pinecone (`namespace: 'guidelines'`) | Permanente (enquanto vigentes) | Diretrizes clínicas públicas | Atualização por nova versão de diretriz |

---

## 2. Rotação de Segredos JWT (Dual-Key)

### 2.1 Visão Geral
A rotação utiliza o modelo **Dual-Key**. Ao rotacionar, o segredo ativo (`JWT_SECRET`) passa para `JWT_SECRET_PREVIOUS`, e um novo segredo seguro é gerado para assinar novas sessões. Durante a janela de transição (24h), tokens antigos continuam válidos no middleware sem deslogar gestantes ou médicos em consultas ativas.

### 2.2 Pré-requisitos
- Acesso ao ambiente ou arquivo `.env`.
- Verificação prévia de integridade da API:
  ```bash
  curl -i http://localhost:3000/health
  ```

### 2.3 Passo 1: Simulação (Dry-Run)
Valide a rotação sem aplicar alterações em disco:
```bash
node apps/api/scripts/rotate-jwt-secret-and-generate-token.js --dry-run
```
*Saída esperada: Confirmação em JSON com `action: "ROTATE_DUAL_KEY"`, `dryRun: true` e formato das chaves.*

### 2.4 Passo 2: Execução da Rotação
Execute a rotação real no arquivo `.env` e reinicie os containers:
```bash
node apps/api/scripts/rotate-jwt-secret-and-generate-token.js --restart
```
*Efeito: `JWT_SECRET_PREVIOUS` recebe o segredo anterior; novo `JWT_SECRET` é gerado; o backend recarrega as variáveis.*

### 2.5 Passo 3: Validação Operacional
1. Teste uma requisição com um token emitido antes da rotação: deve retornar `HTTP 200` (validado via `JWT_SECRET_PREVIOUS`).
2. Realize login de um usuário para obter um novo token: deve autenticar via `JWT_SECRET`.
3. Verifique os logs estruturados:
   ```bash
   grep "AUTH_TOKEN_PREVIOUS_KEY" apps/api/logs/*.log
   ```

### 2.6 Passo 4: Expurgo da Chave Anterior (Após 24h)
Após expirado o tempo de vida máximo de todos os tokens pré-existentes (grace period de 24 horas), execute a remoção da chave anterior:
```bash
node apps/api/scripts/rotate-jwt-secret-and-generate-token.js --clear-previous --restart
```

### 2.7 Procedimento de Rollback (JWT)
Caso o novo segredo apresente qualquer inconsistência operacional:
1. Reabra o arquivo `.env`.
2. Restaure o valor de `JWT_SECRET_PREVIOUS` de volta para `JWT_SECRET`.
3. Reinicie o backend:
   ```bash
   docker compose restart backend
   ```

---

## 3. Rotação de Chaves AES-256-GCM e Re-criptografia em Lotes

### 3.1 Visão Geral
O MyFetus utiliza keyring versionado gerenciado por `cryptoService` e `fileCryptoService`. Ao introduzir uma nova chave (ex: `V2`):
- O keyring mantém `AES_ENCRYPTION_KEY_V1` ativo para leitura.
- O novo `AES_ENCRYPTION_KEY_V2` e `AES_KEY_VERSION=2` passam a cifrar novas operações.
- O script `reencrypt-classified-data.js` processa em lotes transacionais atômicos (`--batch-size=100`), sendo 100% retomável (*resumable*) após interrupções acidentais ou operacionais.

### 3.2 Pré-requisitos e Backup
1. **Backup completo do banco PostgreSQL:**
   ```bash
   pg_dump -h $PG_HOST -U $PG_USER -d $PG_DATABASE -Fc -f "backup_pre_aes_rotation_$(date +%Y%m%d_%H%M%S).dump"
   ```
2. **Snapshot do diretório de uploads cifrados:**
   ```bash
   tar -czf "backup_uploads_encrypted_$(date +%Y%m%d_%H%M%S).tar.gz" uploads/encrypted/
   ```

### 3.3 Passo 1: Geração da Nova Chave AES e Provisionamento
Gere uma chave de 32 bytes (64 caracteres hexadecimais):
```bash
node apps/api/scripts/generate-aes-key.js
```
No arquivo `.env`, adicione a nova chave preservando a anterior:
```env
AES_KEY_VERSION=2
AES_ENCRYPTION_KEY_V1=<chave_v1_mantida_para_leitura>
AES_ENCRYPTION_KEY_V2=<nova_chave_gerada_para_escrita>
```

### 3.4 Passo 2: Inventário do Estado Inicial
Consulte o inventário de versões sem alterar nenhum dado:
```bash
node apps/api/scripts/reencrypt-classified-data.js --status
```
*Exibe a tabela com total de registros, quantos estão na versão atual e quantos estão pendentes.*

### 3.5 Passo 3: Simulação Segura (Dry-Run)
Execute a simulação da re-criptografia:
```bash
node apps/api/scripts/reencrypt-classified-data.js --dry-run
```
*Valida conexão, permissões e decriptografia com a chave V1 e cifragem com V2 sem gravar no banco nem no disco.*

### 3.6 Passo 4: Execução em Lotes
Execute a re-criptografia efetiva com paginação atômica:
```bash
node apps/api/scripts/reencrypt-classified-data.js --execute --batch-size=100
```
*Cada lote de 100 registros é comitado individualmente e a coluna `encryption_key_version` é atualizada para 2.*

### 3.7 Teste de Interrupção e Retomabilidade
- Se o processo for interrompido com `Ctrl+C` (SIGINT) ou por queda de rede:
  - O lote em andamento fecha de forma atômica (`ROLLBACK` ou `COMMIT` do lote corrente).
  - Os lotes anteriores permanecem salvos com `encryption_key_version = 2`.
  - Para retomar, basta reexecutar o mesmo comando: o filtro `WHERE encryption_key_version < 2` buscará apenas os registros ainda não migrados, sem duplicar trabalho.

### 3.8 Procedimento de Rollback (AES)
Como todas as chaves anteriores permanecem no keyring, os registros com `encryption_key_version = 1` e `encryption_key_version = 2` permanecem perfeitamente decifráveis pela aplicação.
Se for necessário cancelar a migração antes do término:
1. Interrompa o script de re-criptografia.
2. A aplicação continuará lendo ambos os dados normalmente.
3. Para restaurar o estado prévio exato, restaure o dump do banco de dados e o snapshot dos arquivos.

---

## 4. Higienização e Quarentena de Uploads

### 4.1 Visão Geral
O script `cleanup-orphan-uploads.js` implementa salvaguardas estritas contra deleção indevida de dados médicos:
- **Janela de Carência de 24h:** Arquivos com menos de 24 horas são ignorados (protege uploads em trânsito).
- **Modo Dry-Run Obrigatório:** A simulação emite um manifesto estruturado em JSON com hashes SHA-256.
- **Quarentena Preventiva de 7 Dias:** A execução ativa move arquivos para `uploads/.quarantine/<timestamp>/` em vez de excluí-los imediatamente.
- **Preservação de Registros Clínicos:** Quando uma linha de `pregnant_documents` aponta para um arquivo físico ausente no disco, o registro no banco **nunca é excluído**; é sinalizado como erro de integridade e gera auditoria com severidade alta.

### 4.2 Passo 1: Varredura e Emissão do Manifesto (Dry-Run)
Execute a varredura diagnóstica:
```bash
node apps/api/scripts/cleanup-orphan-uploads.js --dry-run --grace-hours=24
```
*Saída esperada: Resumo de órfãos encontrados, arquivos recentes preservados e caminho do manifesto gerado (ex: `reports/orphan-manifest-<timestamp>.json`).*

### 4.3 Passo 2: Revisão Operacional do Manifesto
Abra o manifesto gerado em `reports/` e valide a lista de arquivos:
- Confirme se os arquivos listados são temporários interrompidos ou resíduos sem vínculo.
- Verifique a seção `missingFiles` para identificar se há exames com arquivos ausentes no storage.

### 4.4 Passo 3: Execução com Quarentena Aprovada
Execute a movimentação para quarentena referenciando o manifesto aprovado:
```bash
node apps/api/scripts/cleanup-orphan-uploads.js --execute --manifest="reports/orphan-manifest-YYYY-MM-DDTHH-mm-ss.json"
```
*Efeito:*
- Arquivos órfãos são movidos para `uploads/.quarantine/<batch_id>/`.
- Inconsistências de arquivos ausentes são marcadas como `extraction_status = 'failed'` com erro `INTEGRITY_ERROR_FILE_MISSING`.
- Eventos `STORAGE_CLEANUP_QUARANTINE` e `DOCUMENT_INTEGRITY_ANOMALY` são registrados na tabela `audit_logs`.

### 4.5 Restauração a partir da Quarentena (Rollback de Órfão)
Caso um arquivo tenha sido catalogado como órfão por engano:
1. Localize o arquivo na pasta de quarentena correspondente:
   `uploads/.quarantine/<batch_id>/<caminho_relativo>`
2. Mova o arquivo de volta para a localização original:
   ```bash
   mv uploads/.quarantine/<batch_id>/encrypted/<uuid>.mfe uploads/encrypted/<uuid>.mfe
   ```
3. O vínculo com o prontuário voltará a funcionar imediatamente.

### 4.6 Expurgo Definitivo de Quarentenas Vencidas
Para liberar espaço em disco expurgando quarentenas com retenção superior a 7 dias:
```bash
node apps/api/scripts/cleanup-orphan-uploads.js --execute --manifest="reports/orphan-manifest-...json" --purge-quarantine-older-than-days=7
```

---

## 5. Auditoria e Conformidade LGPD

Todas as operações deste runbook cumprem as seguintes regras de auditoria e confidencialidade:
1. **Não-exposição de segredos:** Nenhuma chave AES (hexadecimal) ou segredo JWT é gravado em logs, manifestos ou banco de dados.
2. **Não-exposição de conteúdo clínico:** Os manifestos e logs registram apenas caminhos de sistema, tamanhos, hashes SHA-256 e identificadores numéricos de recursos (`resource_id`).
3. **Imutabilidade do Prontuário:** A ausência de arquivo físico dispara alertas de integridade para atuação humana, impedindo que falhas de infraestrutura apaguem silenciosamente históricos médicos de gestantes.
