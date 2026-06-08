# Simulador de casos críticos

Implementação das Tarefas 1 e 2 da sprint de estresse do RAG.

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

## Teste local

O teste usa mocks e não precisa do backend ou do Pinecone:

```bash
cd apps/api
npm run test:stress-engine
```
