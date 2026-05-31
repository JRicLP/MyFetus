// como executar o teste:
// cd /home/agil/dev/MyFetus && docker compose run --rm backend node /app/tests/loincMapper.test.js

const assert = require('assert');
const {
  normalizeText,
  mapClinicalTerm,
  mapClinicalText,
  buildMappingSummary,
} = require('../utils/loincMapper');

const normalized = normalizeText('  Hemoglobina total  ');
assert.strictEqual(normalized, 'hemoglobina total');

const hemoglobin = mapClinicalTerm('Hemoglobina');
assert.strictEqual(hemoglobin.status, 'mapped');
assert.strictEqual(hemoglobin.loinc, '718-7');
assert.strictEqual(hemoglobin.matchType, 'exact');

const hb = mapClinicalTerm('HB');
assert.strictEqual(hb.status, 'mapped');
assert.strictEqual(hb.loinc, '718-7');
assert.ok(hb.confidence >= 0.98);

const hematocrit = mapClinicalTerm('Hematócrito');
assert.strictEqual(hematocrit.status, 'mapped');
assert.strictEqual(hematocrit.loinc, '4544-3');

const unknown = mapClinicalTerm('Termo sem correspondencia');
assert.strictEqual(unknown.status, 'unmapped');
assert.strictEqual(unknown.confidence, 0);

const textResult = mapClinicalText(`
Hemoglobina
Hematócrito
Leucócitos
Termo sem correspondencia
`);

assert.strictEqual(textResult.summary.total, 4);
assert.strictEqual(textResult.summary.mapped, 3);
assert.strictEqual(textResult.summary.unmapped, 1);
assert.strictEqual(textResult.summary.coverage, 0.75);

const summary = buildMappingSummary([
  { status: 'mapped' },
  { status: 'mapped' },
  { status: 'ambiguous' },
  { status: 'unmapped' },
]);

assert.deepStrictEqual(summary, {
  total: 4,
  mapped: 2,
  ambiguous: 1,
  unmapped: 1,
  coverage: 0.5,
});

const ambiguous = mapClinicalTerm('ALT/TGP');
assert.strictEqual(ambiguous.status, 'mapped');
assert.strictEqual(ambiguous.loinc, '1742-6');

console.log('OK: loincMapper validado com sucesso.');