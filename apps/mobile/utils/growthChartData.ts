/**
 * Curvas de referência da Caderneta da Gestante (Ministério da Saúde) usadas nos
 * gráficos de acompanhamento de crescimento:
 *   1. Gráfico de acompanhamento nutricional (classificação de Atalah et al., 1997)
 *   2. Curva de altura uterina por idade gestacional (percentis 10 e 90)
 *
 * Os pontos abaixo foram digitalizados a partir do gráfico oficial da caderneta.
 * Os extremos da curva de Atalah (semana 6 e semana 42) seguem os valores
 * publicados (baixo peso < 19,9 / adequado 20,0–24,9 / sobrepeso 25,0–30,0 /
 * obesidade ≥ 30,1 na semana 6; e < 25,0 / 25,1–29,2 / 29,3–33,2 / ≥ 33,3 na
 * semana 42), com as semanas intermediárias interpoladas linearmente.
 */

export type CurvePoint = { week: number; value: number };

/** Limite superior da faixa "baixo peso" / limite inferior de "adequado". */
export const IMC_BAIXO_PESO_ADEQUADO: CurvePoint[] = [
  { week: 6, value: 19.9 }, { week: 8, value: 20.3 }, { week: 10, value: 20.6 },
  { week: 12, value: 21.0 }, { week: 14, value: 21.3 }, { week: 16, value: 21.7 },
  { week: 18, value: 22.0 }, { week: 20, value: 22.4 }, { week: 22, value: 22.7 },
  { week: 24, value: 23.1 }, { week: 26, value: 23.4 }, { week: 28, value: 23.8 },
  { week: 30, value: 24.1 }, { week: 32, value: 24.4 }, { week: 34, value: 24.6 },
  { week: 36, value: 24.7 }, { week: 38, value: 24.9 }, { week: 40, value: 25.0 },
  { week: 42, value: 25.0 },
];

/** Limite superior da faixa "adequado" / limite inferior de "sobrepeso". */
export const IMC_ADEQUADO_SOBREPESO: CurvePoint[] = [
  { week: 6, value: 24.9 }, { week: 8, value: 25.3 }, { week: 10, value: 25.6 },
  { week: 12, value: 26.0 }, { week: 14, value: 26.3 }, { week: 16, value: 26.6 },
  { week: 18, value: 26.9 }, { week: 20, value: 27.2 }, { week: 22, value: 27.5 },
  { week: 24, value: 27.8 }, { week: 26, value: 28.1 }, { week: 28, value: 25.9 },
  { week: 30, value: 28.6 }, { week: 32, value: 28.8 }, { week: 34, value: 29.0 },
  { week: 36, value: 29.1 }, { week: 38, value: 29.2 }, { week: 40, value: 29.2 },
  { week: 42, value: 29.2 },
];

/** Limite superior da faixa "sobrepeso" / limite inferior de "obesidade". */
export const IMC_SOBREPESO_OBESIDADE: CurvePoint[] = [
  { week: 6, value: 30.0 }, { week: 8, value: 30.3 }, { week: 10, value: 30.6 },
  { week: 12, value: 30.9 }, { week: 14, value: 31.1 }, { week: 16, value: 31.4 },
  { week: 18, value: 31.6 }, { week: 20, value: 31.9 }, { week: 22, value: 32.1 },
  { week: 24, value: 32.3 }, { week: 26, value: 32.5 }, { week: 28, value: 32.7 },
  { week: 30, value: 32.8 }, { week: 32, value: 32.9 }, { week: 34, value: 33.0 },
  { week: 36, value: 33.1 }, { week: 38, value: 33.2 }, { week: 40, value: 33.2 },
  { week: 42, value: 33.2 },
];

export const IMC_CHART_DOMAIN = { x: [6, 42] as [number, number], y: [17, 40] as [number, number] };

/** Percentil 10 (limite inferior) da altura uterina por semana gestacional. */
export const ALTURA_UTERINA_P10: CurvePoint[] = [
  { week: 13, value: 8 }, { week: 15, value: 9.5 }, { week: 17, value: 11 },
  { week: 19, value: 13 }, { week: 21, value: 15 }, { week: 23, value: 17 },
  { week: 25, value: 19 }, { week: 27, value: 21 }, { week: 29, value: 23 },
  { week: 31, value: 25 }, { week: 33, value: 27 }, { week: 35, value: 28.5 },
  { week: 37, value: 30 }, { week: 39, value: 31 },
];

/** Percentil 90 (limite superior) da altura uterina por semana gestacional. */
export const ALTURA_UTERINA_P90: CurvePoint[] = [
  { week: 13, value: 13 }, { week: 15, value: 15 }, { week: 17, value: 17 },
  { week: 19, value: 19 }, { week: 21, value: 21 }, { week: 23, value: 23 },
  { week: 25, value: 25 }, { week: 27, value: 27 }, { week: 29, value: 29 },
  { week: 31, value: 30 }, { week: 33, value: 32 }, { week: 35, value: 33 },
  { week: 37, value: 34 }, { week: 39, value: 35 },
];

export const ALTURA_UTERINA_CHART_DOMAIN = { x: [13, 39] as [number, number], y: [7, 35] as [number, number] };

export const clampValue = (value: number, [min, max]: [number, number]): number =>
  Math.min(Math.max(value, min), max);

export const clampChartPoint = (
  point: { week: number; value: number },
  domain: { x: [number, number]; y: [number, number] }
) => ({
  x: clampValue(point.week, domain.x),
  y: clampValue(point.value, domain.y),
});

/** Interpola linearmente o valor da curva para uma semana gestacional qualquer. */
export const interpolateCurve = (points: CurvePoint[], week: number): number => {
  const clampedWeek = Math.min(Math.max(week, points[0].week), points[points.length - 1].week);

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (clampedWeek >= a.week && clampedWeek <= b.week) {
      const ratio = (clampedWeek - a.week) / (b.week - a.week);
      return a.value + ratio * (b.value - a.value);
    }
  }
  return points[points.length - 1].value;
};

export type ClassificacaoNutricional = 'Baixo peso' | 'Adequado' | 'Sobrepeso' | 'Obesidade';

export const classificarIMCPorSemana = (week: number, imc: number): ClassificacaoNutricional => {
  if (imc < interpolateCurve(IMC_BAIXO_PESO_ADEQUADO, week)) return 'Baixo peso';
  if (imc <= interpolateCurve(IMC_ADEQUADO_SOBREPESO, week)) return 'Adequado';
  if (imc <= interpolateCurve(IMC_SOBREPESO_OBESIDADE, week)) return 'Sobrepeso';
  return 'Obesidade';
};

export type ClassificacaoAlturaUterina = 'Abaixo do esperado' | 'Adequada' | 'Acima do esperado';

export const classificarAlturaUterinaPorSemana = (week: number, altura: number): ClassificacaoAlturaUterina => {
  if (altura < interpolateCurve(ALTURA_UTERINA_P10, week)) return 'Abaixo do esperado';
  if (altura > interpolateCurve(ALTURA_UTERINA_P90, week)) return 'Acima do esperado';
  return 'Adequada';
};

/** Média populacional de IMC na semana, aproximada pelo ponto médio da faixa "Adequado". */
export const getIMCPopulationAverage = (week: number): number => {
  const lower = interpolateCurve(IMC_BAIXO_PESO_ADEQUADO, week);
  const upper = interpolateCurve(IMC_ADEQUADO_SOBREPESO, week);
  return (lower + upper) / 2;
};

/** Média populacional de altura uterina na semana, aproximada pelo ponto médio entre P10 e P90. */
export const getAlturaUterinaPopulationAverage = (week: number): number => {
  const lower = interpolateCurve(ALTURA_UTERINA_P10, week);
  const upper = interpolateCurve(ALTURA_UTERINA_P90, week);
  return (lower + upper) / 2;
};
