import assert from 'node:assert';
import test from 'node:test';
import {
  calculateDPP,
  calculateGestationWeek,
  localDateKey,
} from '../utils/gestationDate';

test.describe('gestation dates', () => {
  test.it('calcula semanas usando datas civis', () => {
    const result = calculateGestationWeek('01/01/2026', new Date(2026, 4, 21, 23, 30));
    assert.deepStrictEqual(result, { weeks: 20 });
  });

  test.it('rejeita DUM futura em vez de usar diferença absoluta', () => {
    const result = calculateGestationWeek('03/10/2026', new Date(2026, 9, 2, 12));
    assert.strictEqual(result.weeks, 0);
    assert.match(result.warning ?? '', /futuro/);
  });

  test.it('rejeita datas civis inexistentes', () => {
    const result = calculateGestationWeek('31/02/2026', new Date(2026, 9, 2, 12));
    assert.strictEqual(result.weeks, 0);
    assert.match(result.warning ?? '', /válida/);
  });

  test.it('calcula DPP sem deslocamento de fuso', () => {
    assert.strictEqual(calculateDPP('2026-01-01'), '08/10/2026');
  });

  test.it('gera a chave diária no calendário local', () => {
    assert.strictEqual(localDateKey(new Date(2026, 0, 2, 0, 15)), '2026-01-02');
  });
});
