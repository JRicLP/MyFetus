# Simulador de casos críticos

Implementação das tarefas 1 a 4 da sprint de estresse do RAG.

## Configuração

Gere o JWT de teste:

```bash
cd apps/api
npm run jwt:test-token
```

Defina no ambiente:

```env
RAG_BASE_URL=http://localhost:3000
RAG_TEST_JWT=<token-gerado>
RAG_TIMEOUT_MS=5000
RAG_MAX_ATTEMPTS=2
RAG_RETRY_DELAY_MS=100
```

## Módulos

- `scenarios/clinical_scenarios.js`: catálogo de cenários e estágios.
- `scenarios/evaluation_criteria.js`: ground truth clínico para avaliação.
- `engine/ragClient.js`: cliente HTTP com autenticação, timeout e retry.
- `engine/scenarioRunner.js`: execução sequencial e avaliação de cenários.
- `engine/loadRunner.js`: carga sequential, burst, ramp e sustained.
- `run_stress_test.js`: CLI principal para executar cenários e modos de carga.
- `generate_stress_report.js`: converte o JSON do simulador em relatório markdown.

## Execução

```bash
node scripts/stress_test/run_stress_test.js --scenario preeclampsia
node scripts/stress_test/run_stress_test.js --all --mode ramp
node scripts/stress_test/run_stress_test.js --all --output reports/stress_baseline.json
node scripts/stress_test/generate_stress_report.js --input reports/stress_baseline.json --output reports/stress_baseline.md
```

## Teste local

O teste usa mocks e não precisa do backend ou do Pinecone:

```bash
cd apps/api
npm run test:stress-engine
npm run test:stress
```

O teste de integração exige backend local, Pinecone configurado e JWT:

```bash
cd apps/api
RUN_STRESS_INTEGRATION=1 npm run test:stress:integration
```
