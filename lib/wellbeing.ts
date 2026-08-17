import { services } from '@/data/mock';
import type { Booking, Pet } from '@/data/types';
import { colors } from '@/theme/tokens';
import { DAY_MS, daysSince, daysUntil, parseEsDate } from '@/lib/dates';

export const BATH_CYCLE_DAYS = 7;
export const VACCINE_WARN_DAYS = 14;
export const VISIT_CYCLE_DAYS = 180;
export const VACCINE_VALID_DAYS = 365;

export type CareLevel = 'ok' | 'warn' | 'alarm' | 'unknown';

export type CareItem = {
  id: 'bath' | 'vaccine' | 'visit';
  label: string;
  emoji: string;
  score: number;
  level: CareLevel;
  detail: string;
  to: string;
};

export type Wellbeing = {
  value: number;
  color: string;
  alarm: boolean;
  headline: string;
  items: CareItem[];
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function latestCareAt(bookings: Booking[], kind: CareItem['id'], now: number) {
  const times = bookings
    .filter((b) => {
      if (b.status === 'cancelled') return false;
      const at = b.at ?? 0;
      if (at <= 0 || at > now) return false;
      return careKind(b.serviceId) === kind;
    })
    .map((b) => b.at as number);
  return times.length ? Math.max(...times) : undefined;
}

export function lastCareAt(bookings: Booking[], kind: CareItem['id'], now = Date.now()) {
  return latestCareAt(bookings, kind, now);
}

export function vaccineDates(pet: Pet | null | undefined, bookings: Booking[], now = Date.now()) {
  const fromBooking = latestCareAt(bookings, 'vaccine', now);
  const lastAt = fromBooking ?? parseEsDate(pet?.lastVaccine);
  const dueFromLast = lastAt != null ? lastAt + VACCINE_VALID_DAYS * DAY_MS : undefined;
  const dueAt = fromBooking ? dueFromLast : parseEsDate(pet?.nextVaccine) ?? dueFromLast;
  const inferredLast =
    lastAt ?? (dueAt != null ? dueAt - VACCINE_VALID_DAYS * DAY_MS : undefined);
  return { lastAt: inferredLast, dueAt, fromBooking: fromBooking != null };
}

export function careKind(serviceId: string): CareItem['id'] | undefined {
  const service = services.find((s) => s.id === serviceId);
  const name = `${serviceId} ${service?.name ?? ''}`.toLowerCase();
  if (name.includes('vacun')) return 'vaccine';
  if (service?.category === 'grooming' || name.includes('bano') || name.includes('baño')) return 'bath';
  if (service?.category === 'clinic') return 'visit';
  return undefined;
}

function bathItem(lastAt: number | undefined): CareItem {
  const to = '/booking/luna';
  if (lastAt == null) {
    return {
      id: 'bath',
      label: 'Baño',
      emoji: '🛁',
      score: 55,
      level: 'unknown',
      detail: 'Sin baño registrado',
      to,
    };
  }
  const days = daysSince(lastAt);
  const score = clamp((1 - days / BATH_CYCLE_DAYS) * 100);
  const level: CareLevel = days >= BATH_CYCLE_DAYS ? 'alarm' : days >= 5 ? 'warn' : 'ok';
  const detail =
    days <= 0
      ? 'Baño de hoy'
      : days === 1
        ? 'Hace 1 día'
        : days >= BATH_CYCLE_DAYS
          ? days === BATH_CYCLE_DAYS
            ? 'Hace 1 semana · ¡hay que bañarlo!'
            : `Hace ${days} días · ¡baño urgente!`
          : `Hace ${days} días`;
  return { id: 'bath', label: 'Baño', emoji: '🛁', score, level, detail, to };
}

function vaccineItem(dueAt: number | undefined): CareItem {
  const to = '/booking/san-martin';
  if (dueAt == null) {
    return {
      id: 'vaccine',
      label: 'Vacunas',
      emoji: '💉',
      score: 55,
      level: 'unknown',
      detail: 'Sin fecha de vacuna',
      to,
    };
  }
  const left = daysUntil(dueAt);
  const score =
    left < 0 ? 0 : left >= VACCINE_WARN_DAYS ? 100 : clamp((left / VACCINE_WARN_DAYS) * 100);
  const level: CareLevel = left < 0 ? 'alarm' : left <= 7 ? 'warn' : 'ok';
  const detail =
    left < 0
      ? left === -1
        ? 'Vencida ayer · ¡vacuná ya!'
        : `Vencida hace ${Math.abs(left)} días · ¡urgente!`
      : left === 0
        ? 'Vence hoy'
        : left === 1
          ? 'Vence mañana'
          : `En ${left} días`;
  return { id: 'vaccine', label: 'Vacunas', emoji: '💉', score, level, detail, to };
}

function visitItem(lastAt: number | undefined): CareItem {
  const to = '/booking/san-martin';
  if (lastAt == null) {
    return {
      id: 'visit',
      label: 'Salud',
      emoji: '💚',
      score: 55,
      level: 'unknown',
      detail: 'Sin visita registrada',
      to,
    };
  }
  const days = daysSince(lastAt);
  const score = clamp((1 - days / VISIT_CYCLE_DAYS) * 100);
  const level: CareLevel =
    days >= VISIT_CYCLE_DAYS ? 'alarm' : days >= VISIT_CYCLE_DAYS - 20 ? 'warn' : 'ok';
  const left = VISIT_CYCLE_DAYS - days;
  const detail =
    days <= 0
      ? 'Control de hoy'
      : days >= VISIT_CYCLE_DAYS
        ? `Hace ${days} días · pedí turno`
        : left <= 20
          ? `Próximo control en ${left} días`
          : `Última visita hace ${days} días`;
  return { id: 'visit', label: 'Salud', emoji: '💚', score, level, detail, to };
}

export function petWellbeing(pet: Pet | null | undefined, bookings: Booking[], now = Date.now()): Wellbeing {
  const lastBath = lastCareAt(bookings, 'bath', now) ?? parseEsDate(pet?.lastBath);
  const lastVisit = lastCareAt(bookings, 'visit', now) ?? parseEsDate(pet?.lastVisit);
  const { dueAt: dueVaccine } = vaccineDates(pet, bookings, now);

  const bath = bathItem(lastBath);
  const vaccine = vaccineItem(dueVaccine);
  const visit = visitItem(lastVisit);
  const items = [visit, vaccine, bath];

  const value = clamp(bath.score * 0.5 + vaccine.score * 0.35 + visit.score * 0.15);
  const alarm = bath.level === 'alarm' || vaccine.level === 'alarm';
  const name = pet?.name ?? 'tu mascota';

  const headline = alarm
    ? bath.level === 'alarm'
      ? `¡${name} lleva una semana o más sin baño!`
      : `¡La vacuna de ${name} está vencida!`
    : visit.level === 'alarm'
      ? `¡${name} necesita un control veterinario!`
      : bath.level === 'warn' || vaccine.level === 'warn'
        ? `Se acerca un cuidado de ${name}`
        : 'Todo bajo control';

  const color = alarm
    ? '#E01010'
    : visit.level === 'alarm' || value < 40
      ? colors.danger
      : bath.level === 'warn' || vaccine.level === 'warn' || value < 70
        ? '#E3941A'
        : colors.success;

  return { value, color, alarm, headline, items };
}

export function careTone(level: CareLevel) {
  if (level === 'alarm') return '#E01010';
  if (level === 'warn') return '#E3941A';
  if (level === 'unknown') return colors.muted;
  return colors.ink;
}
