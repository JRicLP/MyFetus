export type WaterEntry = {
  date: string;
  amount: number;
};

export function parseWaterHistory(raw: string | null): WaterEntry[] {
  if (!raw) return [];

  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];

    return value.filter(
      (entry): entry is WaterEntry =>
        !!entry &&
        typeof entry === 'object' &&
        typeof (entry as WaterEntry).date === 'string' &&
        typeof (entry as WaterEntry).amount === 'number' &&
        Number.isFinite((entry as WaterEntry).amount)
    );
  } catch {
    return [];
  }
}

export function getWaterAmountForDate(history: WaterEntry[], date: string): number {
  return history.find((entry) => entry.date === date)?.amount ?? 0;
}

export function updateWaterEntry(
  history: WaterEntry[],
  date: string,
  amount: number
): WaterEntry[] {
  return history.some((entry) => entry.date === date)
    ? history.map((entry) => (entry.date === date ? { ...entry, amount } : entry))
    : [...history, { date, amount }];
}
