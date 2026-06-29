const assert = require('assert');
const {
  HistoryValidationError,
  createFetalBiometry,
  createMaternalWeight,
  listFetalBiometries,
  parseHistoryFilters,
} = require('../services/clinicalHistoryService');

async function run() {
  let assertions = 0;
  const db = {
    calls: [],
    async query(text, values) {
      this.calls.push({ text, values });
      return { rows: [{ id: 1, pregnancy_id: values[0] }] };
    },
  };

  const fetal = await createFetalBiometry(
    db,
    7,
    {
      measured_at: '2026-06-15',
      gestational_age_weeks: 32,
      dbp_mm: 82,
      cc_mm: 300,
      ca_mm: 280,
      cf_mm: 62,
      notes: 'Ultrassom de rotina',
    },
    3
  );
  assert.strictEqual(fetal.pregnancy_id, 7);
  assert.ok(db.calls[0].text.includes('INSERT INTO fetal_biometry_history'));
  assert.ok(db.calls[0].values[7] > 1800);
  assert.ok(db.calls[0].values[9] >= 0 && db.calls[0].values[9] <= 100);
  assertions += 4;

  await createMaternalWeight(
    db,
    7,
    { measured_at: '2026-06-15', weight_kg: 68.4 },
    3
  );
  assert.ok(db.calls[1].text.includes('INSERT INTO maternal_weight_history'));
  assert.strictEqual(db.calls[1].values[2], 68.4);
  assertions += 2;

  await listFetalBiometries(db, 7, {
    from: '2026-01-01',
    to: '2026-06-30',
    order: 'desc',
    limit: '25',
  });
  assert.ok(db.calls[2].text.includes('ORDER BY measured_at DESC'));
  assert.deepStrictEqual(db.calls[2].values, [
    7,
    '2026-01-01',
    '2026-06-30',
    25,
  ]);
  assertions += 2;

  assert.throws(
    () => parseHistoryFilters({ order: 'random' }),
    HistoryValidationError
  );
  assert.throws(
    () => parseHistoryFilters({ from: '2026-06-30', to: '2026-01-01' }),
    HistoryValidationError
  );
  assert.throws(
    () => parseHistoryFilters({ from: '2026-02-31' }),
    HistoryValidationError
  );
  await assert.rejects(
    () =>
      createFetalBiometry(
        db,
        7,
        {
          gestational_age_weeks: 9,
          dbp_mm: 82,
          cc_mm: 300,
          ca_mm: 280,
          cf_mm: 62,
        },
        3
      ),
    HistoryValidationError
  );
  await assert.rejects(
    () => createMaternalWeight(db, 7, { weight_kg: 0 }, 3),
    HistoryValidationError
  );
  assertions += 5;

  console.log(`clinicalHistoryService: ${assertions} assertions passaram`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
