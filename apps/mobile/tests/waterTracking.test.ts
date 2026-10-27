import assert from 'node:assert';
import test from 'node:test';
import {
  getWaterAmountForDate,
  parseWaterHistory,
  updateWaterEntry,
} from '../utils/waterTracking';

test.describe('water tracking state', () => {
  test.it('restaura o total registrado para o dia', () => {
    const history = parseWaterHistory('[{"date":"2026-10-02","amount":700}]');
    assert.strictEqual(getWaterAmountForDate(history, '2026-10-02'), 700);
  });

  test.it('atualiza o dia sem apagar o histórico anterior', () => {
    const history = [
      { date: '2026-10-01', amount: 1200 },
      { date: '2026-10-02', amount: 700 },
    ];

    assert.deepStrictEqual(updateWaterEntry(history, '2026-10-02', 900), [
      { date: '2026-10-01', amount: 1200 },
      { date: '2026-10-02', amount: 900 },
    ]);
  });

  test.it('ignora storage inválido', () => {
    assert.deepStrictEqual(parseWaterHistory('{invalid'), []);
    assert.deepStrictEqual(parseWaterHistory('[{"date":1,"amount":"200"}]'), []);
  });
});
