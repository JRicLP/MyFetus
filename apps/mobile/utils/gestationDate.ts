const DAY_IN_MS = 24 * 60 * 60 * 1000;

type CivilDate = {
  day: number;
  month: number;
  year: number;
};

export type GestationResult = {
  weeks: number;
  warning?: string;
};

function parseDateParts(value: string): CivilDate | null {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);

  const year = Number(isoMatch?.[1] ?? brMatch?.[3]);
  const month = Number(isoMatch?.[2] ?? brMatch?.[2]);
  const day = Number(isoMatch?.[3] ?? brMatch?.[1]);

  if (!year || !month || !day) return null;

  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return { day, month, year };
}

function toUtcTimestamp(value: CivilDate): number {
  return Date.UTC(value.year, value.month - 1, value.day);
}

function todayAsCivilDate(now: Date): CivilDate {
  return {
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function calculateGestationWeek(lastPeriod: string, now = new Date()): GestationResult {
  const parsed = parseDateParts(lastPeriod);
  if (!parsed) {
    return { weeks: 0, warning: 'Informe uma data da última menstruação válida.' };
  }

  const diffDays = Math.floor(
    (toUtcTimestamp(todayAsCivilDate(now)) - toUtcTimestamp(parsed)) / DAY_IN_MS
  );

  if (diffDays < 0) {
    return { weeks: 0, warning: 'A data da última menstruação não pode estar no futuro.' };
  }

  const weeks = Math.floor(diffDays / 7);
  if (weeks > 42) {
    return {
      weeks,
      warning: 'Atenção: a gestação está com mais de 42 semanas. Consulte seu médico imediatamente.',
    };
  }

  return { weeks };
}

export function calculateDPP(lastPeriod: string): string {
  const parsed = parseDateParts(lastPeriod);
  if (!parsed) return '';

  const dpp = new Date(toUtcTimestamp(parsed) + 280 * DAY_IN_MS);
  const day = String(dpp.getUTCDate()).padStart(2, '0');
  const month = String(dpp.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${dpp.getUTCFullYear()}`;
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
