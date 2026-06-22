const assert = require('assert');
const {
  createChunks,
  normalizeWhitespace,
  slugify,
} = require('../services/chunkingService');

const normalized = normalizeWhitespace('Texto   com    espaços\r\n\r\n\r\nnova linha.');
assert.strictEqual(normalized, 'Texto com espaços\n\nnova linha.');

const slug = slugify('FEBRASGO — Predição e prevenção da pré-eclâmpsia 2023');
assert.strictEqual(slug, 'febrasgo-predicao-e-prevencao-da-pre-eclampsia-2023');

const sampleText = `
--- Página 1 ---
A pré-eclâmpsia é uma condição hipertensiva da gestação.

Ela pode ocorrer após 20 semanas de gestação e exige acompanhamento materno-fetal.

--- Página 2 ---
O rastreamento precoce permite identificar gestantes com maior risco.

O uso de AAS pode ser indicado para pacientes classificadas como alto risco.
`;

const chunks = createChunks(sampleText, {
  source: 'FEBRASGO - Predição e prevenção da pré-eclâmpsia',
  documentId: 'febrasgo-predicao-prevencao-pre-eclampsia-2023',
  section: 'Predição e prevenção',
  documentType: 'guideline',
}, {
  chunkSize: 140,
  chunkOverlap: 30,
});

assert.ok(chunks.length > 1);
assert.strictEqual(chunks[0].metadata.source, 'FEBRASGO - Predição e prevenção da pré-eclâmpsia');
assert.strictEqual(chunks[0].metadata.documentId, 'febrasgo-predicao-prevencao-pre-eclampsia-2023');
assert.strictEqual(chunks[0].metadata.documentType, 'guideline');
assert.strictEqual(chunks[0].metadata.chunkIndex, 0);
assert.strictEqual(chunks[0].metadata.totalChunks, chunks.length);
assert.ok(chunks[0].text.length > 0);
assert.ok(chunks[0].id.startsWith('febrasgo-predicao-prevencao-pre-eclampsia-2023-'));

console.log('OK: chunkingService validado com sucesso.');
console.log(`Chunks gerados: ${chunks.length}`);
console.log('Primeiro chunk:', chunks[0]);