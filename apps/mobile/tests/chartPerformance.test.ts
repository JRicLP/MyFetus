import assert from 'node:assert';
import test from 'node:test';
import {
  ALTURA_UTERINA_CHART_DOMAIN,
  IMC_CHART_DOMAIN,
  clampChartPoint,
} from '../utils/growthChartData';

function generateWeeklyPoints() {
  return Array.from({ length: 37 }, (_, index) => ({
    week: index + 6,
    value: 22 + index * 0.18,
  }));
}

test.describe('chart performance data guards', () => {
  test.it('mantém séries semanais dentro do domínio do gráfico de IMC', () => {
    const points = generateWeeklyPoints().map((point) => clampChartPoint(point, IMC_CHART_DOMAIN));

    assert.strictEqual(points.length, 37);
    assert.ok(points.every((point) => point.x >= 6 && point.x <= 42));
    assert.ok(points.every((point) => point.y >= 17 && point.y <= 40));
  });

  test.it('clampa volume extremo e valores fora de domínio sem crash de dados', () => {
    const extreme = Array.from({ length: 200 }, (_, index) => ({
      week: index % 2 === 0 ? 3 : 45,
      value: index % 2 === 0 ? 5 : 55,
    }));
    const points = extreme.map((point) => clampChartPoint(point, IMC_CHART_DOMAIN));

    assert.strictEqual(points.length, 200);
    assert.ok(points.every((point) => point.x >= 6 && point.x <= 42));
    assert.ok(points.every((point) => point.y >= 17 && point.y <= 40));
  });

  test.it('clampa altura uterina fora do domínio esperado', () => {
    const low = clampChartPoint({ week: 3, value: 2 }, ALTURA_UTERINA_CHART_DOMAIN);
    const high = clampChartPoint({ week: 44, value: 50 }, ALTURA_UTERINA_CHART_DOMAIN);

    assert.deepStrictEqual(low, { x: 13, y: 7 });
    assert.deepStrictEqual(high, { x: 39, y: 35 });
  });
});
