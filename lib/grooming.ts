import { places, slots } from '@/data/mock';
import type { Booking, Place } from '@/data/types';
import { startOfDay } from '@/lib/dates';
import type { Coord } from '@/lib/geo';
import { haversineKm } from '@/lib/geo';

export type SalonCupo = {
  place: Place;
  slots: string[];
  km: number;
};

function toMin(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function parseOpenHours(hours: string) {
  const m = hours.match(/(\d{1,2})\s*a\s*(\d{1,2})/);
  if (!m) return { open: 9 * 60, close: 19 * 60 };
  return { open: Number(m[1]) * 60, close: Number(m[2]) * 60 };
}

function occupiesToday(booking: Booking, dayStart: number) {
  if (booking.status === 'cancelled') return false;
  if (booking.at) return startOfDay(booking.at) === dayStart;
  return false;
}

export function freeSlotsOnDay(
  place: Place,
  bookings: Booking[],
  dayStart: number,
  now = Date.now(),
) {
  const { open, close } = parseOpenHours(place.hours);
  const isToday = dayStart === startOfDay(now);
  if (isToday && !place.open) return [];
  const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const taken = new Set(
    bookings.filter((b) => b.placeId === place.id && occupiesToday(b, dayStart)).map((b) => b.time),
  );

  return slots.filter((time) => {
    const min = toMin(time);
    if (min < open || min >= close) return false;
    if (isToday && min <= nowMin) return false;
    return !taken.has(time);
  });
}

export function freeSlotsToday(place: Place, bookings: Booking[], now = Date.now()) {
  return freeSlotsOnDay(place, bookings, startOfDay(now), now);
}

export function salonsWithCupos(
  bookings: Booking[],
  now = Date.now(),
  from?: Coord | null,
): SalonCupo[] {
  return places
    .filter((p) => p.kind === 'grooming')
    .map((place) => ({
      place,
      slots: freeSlotsToday(place, bookings, now),
      km: from ? haversineKm(from, place.coordinate) : place.distanceKm,
    }))
    .filter((row) => row.slots.length > 0)
    .sort((a, b) => a.km - b.km || b.slots.length - a.slots.length);
}
