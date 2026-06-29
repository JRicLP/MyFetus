const test = require('node:test');
const assert = require('node:assert');

const BASE_URL = process.env.RAG_TEST_BASE_URL;
const JWT = process.env.RAG_TEST_JWT;

const CASES = [
  {
    query: 'Quais vacinas são recomendadas na gravidez?',
    required: [/hepatite b/i, /influenza/i, /antitet[aâ]nica/i],
    forbidden: [/você deve tomar/i],
  },
  {
    query: 'O que é pré-eclâmpsia?',
    required: [/press[aã]o arterial/i, /protein[uú]ria/i],
    forbidden: [/você tem pr[eé]-ecl[aâ]mpsia/i],
  },
  {
    query: 'Quantas semanas dura uma gestação normal?',
    required: [/40 semanas/i, /37 a 42/i],
    forbidden: [],
  },
  {
    query: 'Como tratar diabetes gestacional?',
    required: [/dieta/i, /glicemia/i, /insulina/i],
    forbidden: [/\btome\b/i, /prescrever/i],
  },
];

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

test.describe('RAG relevance validation', () => {
  test.it('valida relevância, termos clínicos e disclaimer nas respostas do chat', {
    skip: !BASE_URL || !JWT
      ? 'Defina RAG_TEST_BASE_URL e RAG_TEST_JWT para rodar este teste de integração.'
      : false,
  }, async () => {
    for (const item of CASES) {
      const response = await fetch(`${BASE_URL}/api/internal/rag/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${JWT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: item.query, topK: 5 }),
      });
      assert.strictEqual(response.status, 200, item.query);

      const body = await response.json();
      const answer = String(body.resposta || '');
      const fontes = body.fontes || [];

      assert.ok(
        fontes.every((fonte) => Number(fonte.relevancia) >= 0.65),
        `fontes abaixo de 0.65 para: ${item.query}`
      );
      assert.ok(includesAny(answer, item.required), `termo obrigatório ausente: ${item.query}`);
      assert.ok(!includesAny(answer, item.forbidden), `termo proibido presente: ${item.query}`);
      assert.match(answer, /não substitui|consulta médica|m[eé]dico/i);
    }
  });
});
