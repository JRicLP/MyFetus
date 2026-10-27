# E2E mobile com Maestro

O fluxo de `E2E-120` valida o ciclo sintético de exame:

1. médico acessa a tela de exames e cria a solicitação;
2. gestante seleciona a solicitação e envia um PDF sintético pelo seletor de arquivos;
3. o worker extrai o texto do documento;
4. médico registra o relatório;
5. gestante volta à aba de exames e vê a devolutiva.

## Dados e isolamento

O workflow sobe um PostgreSQL vazio, aplica as migrations e inicia a API local.
`e2e/scripts/seed_exam_cycle.js` cria usuários, consentimentos, gestação e vínculo
usando a API pública. A solicitação é criada pela tela do médico durante o fluxo.
Os e-mails usam `example.test`, o PDF é gerado em tempo de execução e nenhuma
credencial ou informação real de paciente é utilizada.

Depois da execução do Maestro, `e2e/scripts/verify_exam_cycle.js` consulta a API e
confirma simultaneamente:

- solicitação e documento com status `reviewed`;
- extração com status `done`;
- relatório igual ao texto sintético esperado;
- ausência de `file_path` na resposta pública.

## Execução local

Com um emulador Android conectado e a API local disponível em `127.0.0.1:3000`:

```bash
npm ci
npm ci --prefix apps/api
npm ci --prefix apps/mobile
node e2e/scripts/create_synthetic_pdf.js e2e/artifacts/synthetic-lab-report.pdf
```

Prepare as variáveis exibidas por:

```bash
E2E_API_URL=http://127.0.0.1:3000 \
E2E_RUN_ID=local \
node e2e/scripts/seed_exam_cycle.js
```

Instale o Maestro CLI 2.11.0, gere/instale o APK Android com
`EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`, envie o PDF para
`/sdcard/Download/synthetic-lab-report.pdf` e execute:

```bash
maestro test \
  --env=E2E_DOCTOR_EMAIL=... \
  --env=E2E_PATIENT_EMAIL=... \
  --env=E2E_PASSWORD=... \
  --env=E2E_PREGNANT_ID=... \
  --env='E2E_EXAM_NAME=Hemograma sintetico E2E' \
  --env='E2E_REPORT_TEXT=Resultado sintetico revisado: hemoglobina 12.5 g/dL.' \
  e2e/maestro/exam-cycle.yaml
```

O job `Mobile E2E (Maestro)` roda em pull requests que alteram API, mobile ou
os próprios testes e publica o relatório JUnit e os logs como artefato.
