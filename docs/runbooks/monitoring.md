# Runbook de Monitoramento e Alertas: Homologação MyFetus (E1-13)

Este documento orienta a equipe de desenvolvimento e operação sobre a configuração do monitoramento contínuo de uptime gratuito, regras de alerta e o procedimento de resposta a incidentes.

---

## 1. Visão Geral e Endpoints

O backend em homologação no Google Cloud Run disponibiliza duas sondas operacionais:

- **Liveness Probe**: `GET https://myfetus-api-staging-3ajuqsazpa-rj.a.run.app/ping`
  - Checagem rasa para atestar se o processo Node/Express está respondendo requisições HTTP.
  - Retorna `200 OK`: `{"message": "Backend funcionando corretamente."}`.
- **Readiness Probe**: `GET https://myfetus-api-staging-3ajuqsazpa-rj.a.run.app/health`
  - Checagem ativa e profunda das dependências com timeout estrito de 3 segundos em paralelo.
  - Verifica o banco de dados PostgreSQL (`SELECT 1`) e o banco vetorial Pinecone (`describeIndexStats`).
  - **Status 200 OK**: Saudável (`status: "ok"`) ou Degradado (`status: "degraded"` se Pinecone estiver instável, conforme ADR-0001).
  - **Status 503 Service Unavailable**: Crítico (`status: "unhealthy"` se o PostgreSQL estiver inacessível).

---

## 2. Configuração do Monitor de Uptime Gratuito

Recomendamos o **UptimeRobot** (plano gratuito com 50 monitores e checagens a cada 5 minutos) ou o **Better Stack (Better Uptime)**.

### Passo a passo no UptimeRobot:

1. Acesse [https://uptimerobot.com](https://uptimerobot.com) e faça login na conta da equipe.
2. Clique em **Add New Monitor**.
3. Preencha as configurações:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `MyFetus Staging API - Readiness Probe`
   - **URL (or IP)**: `https://myfetus-api-staging-3ajuqsazpa-rj.a.run.app/health`
   - **Monitoring Interval**: `5 minutes`
   - **Monitor Timeout**: `10 seconds`
4. Na seção **Alert Contacts To Notify**, ative o e-mail da equipe e adicione o Webhook configurado abaixo.

---

## 3. Configuração de Alertas

### 3.1 Alertas no WhatsApp da Equipe (via CallMeBot)

O WhatsApp não possui webhook nativo aberto; utilizamos a API gratuita do **CallMeBot** para entrega direta de alertas críticos.

1. **Obtenção da API Key**:
   - Cada membro responsável ou o número dedicado do grupo envia a mensagem `I allow callmebot to send me messages` via WhatsApp para o número do CallMeBot: `+34 911 06 14 06`.
   - O bot responde com a sua `apikey` pessoal.
2. **Cadastro do Webhook no UptimeRobot**:
   - Vá em **My Settings** → **Alert Contacts** → **Add Alert Contact**.
   - **Contact Type**: `Webhook`.
   - **Friendly Name**: `WhatsApp Equipe MyFetus`.
   - **URL to Notify**:
     ```text
     https://api.callmebot.com/whatsapp.php?phone=+55XXXXXXXXXXX&text=ALERTA+MYFETUS:+Staging+indisponivel+(Down)+em+*date*&apikey=SUA_API_KEY
     ```
   - **Send alert when**: Marque *When monitor goes down* e *When monitor comes back up*.
   - Para mensagem de recuperação (Up), configure:
     ```text
     https://api.callmebot.com/whatsapp.php?phone=+55XXXXXXXXXXX&text=MYFETUS+NORMALIZADO:+Staging+restabelecido+(Up)+em+*date*&apikey=SUA_API_KEY
     ```

### 3.2 Alertas por E-mail (Redundância Garantida)
- Cadastre os e-mails dos líderes técnicos e DevOps em **Alert Contacts**.
- Notificações de queda (`Down Alert`) e recuperação (`Up Alert`) chegam em tempo real sem limite de envio.

---

## 4. Teste de Validação com Indisponibilidade Controlada

Para comprovar que o alerta realmente dispara antes de considerar a task concluída:

1. No painel do monitor, altere temporariamente a URL do monitor para uma rota propositalmente inexistente:
   `https://myfetus-api-staging-3ajuqsazpa-rj.a.run.app/health-simulacao-falha`
2. Aguarde 5 minutos até a próxima rodada de checagem.
3. **Verificação**:
   - O monitor deve marcar o serviço como `DOWN` (HTTP 404).
   - Uma mensagem de alerta de queda deve chegar no WhatsApp e no e-mail cadastrado.
4. Retorne a URL imediatamente para a URL correta (`/health`).
5. **Verificação**:
   - O monitor deve retornar a `UP` (HTTP 200).
   - A mensagem de recuperação deve chegar no canal.

---

## 5. Investigação de Incidentes e Rollback

Ao receber um alerta de `DOWN`:

1. **Acessar os Logs Estruturados no Google Cloud**:
   - No Console GCP, vá em **Cloud Run** → Serviço `myfetus-api-staging` → Aba **Logs**.
   - Filtre por severidade: `severity >= ERROR`.
   - Como os logs são emitidos em JSON estruturado (NDJSON), filtre erros de banco com:
     ```text
     jsonPayload.message =~ "Erro ao conectar ao banco de dados"
     ```
2. **Verificar Conectividade Cloud SQL**:
   - Cheque se a instância `myfetus-staging-db` está ativa no Cloud SQL.
   - Verifique se os secrets do Secret Manager (`PG_PASSWORD`) estão íntegros.
3. **Rollback de Aplicação**:
   - Caso uma revisão recente com defeito tenha sido promovida, execute o rollback no Cloud Run para a revisão estável anterior:
     ```bash
     gcloud run services update-traffic myfetus-api-staging \
       --region=southamerica-east1 \
       --to-revisions=myfetus-api-staging-REVISAO_ANTERIOR=100
     ```
