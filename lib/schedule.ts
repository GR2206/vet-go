import type { WalkerHours } from '@/data/types';

export const WORK_STARTS = ['07:00', '08:00', '09:00', '10:00'] as const;
export const WORK_ENDS = ['16:00', '17:00', '18:00', '19:00', '20:00'] as const;

function toMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function fromMin(n: number) {
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function buildWalkSlots(hours: WalkerHours): string[] {
  const start = toMin(hours.start);
  const end = toMin(hours.end);
  const out: string[] = [];
  for (let t = start; t + hours.step <= end; t += hours.step) {
    out.push(fromMin(t));
  }
  return out;
}

export function hoursLabel(hours: WalkerHours) {
  const step = hours.step === 30 ? 'cada 30 min' : 'cada 1 h';
  return `${hours.start} a ${hours.end} · ${step}`;
}

export function appointmentAt(day: number, time: string) {
  const [h, m] = time.split(':').map(Number);
  return new Date(2026, 7, day, h, m, 0, 0).getTime();
}

export function yearsOnApp(joinedAt: string) {
  const start = new Date(`${joinedAt}-01T00:00:00`);
  const years = (Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 1) return 0;
  return Math.floor(years);
}
