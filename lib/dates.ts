const MONTHS: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11,
};

export const DAY_MS = 86_400_000;

export function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Parsea "3 mar 2026" o ISO. */
export function parseEsDate(value?: string): number | undefined {
  if (!value) return undefined;
  const m = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (m) {
    const month = MONTHS[m[2].slice(0, 3)];
    if (month == null) return undefined;
    return new Date(Number(m[3]), month, Number(m[1]), 12, 0, 0, 0).getTime();
  }
  const t = Date.parse(value);
  return Number.isNaN(t) ? undefined : t;
}

export function daysSince(from: number, now = Date.now()) {
  return Math.floor((startOfDay(now) - startOfDay(from)) / DAY_MS);
}

export function daysUntil(to: number, now = Date.now()) {
  return Math.floor((startOfDay(to) - startOfDay(now)) / DAY_MS);
}

export function esDateLabel(ts: number) {
  const d = new Date(ts);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
