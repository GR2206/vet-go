import { places, professionals, services } from '@/data/mock';
import type { Booking, WalkBooking } from '@/data/types';
import { walkers } from '@/data/walkers';

export type PendingItem = {
  id: string;
  kind: 'vet' | 'walk';
  title: string;
  detail: string;
  when: string;
  at: number;
  to: string;
};

export function upcomingPendings(
  bookings: Booking[],
  walks: WalkBooking[],
  now = Date.now(),
): PendingItem[] {
  const vet: PendingItem[] = bookings
    .filter((b) => (b.at ?? 0) > now && b.status !== 'cancelled' && b.status !== 'done')
    .map((b) => {
      const place = places.find((p) => p.id === b.placeId);
      const service = services.find((s) => s.id === b.serviceId);
      const pro = professionals.find((p) => p.id === b.professionalId);
      return {
        id: b.id,
        kind: 'vet' as const,
        title: service?.name ?? 'Turno',
        detail: [place?.name, pro?.name].filter(Boolean).join(' · '),
        when: `${b.dateLabel} · ${b.time}`,
        at: b.at ?? 0,
        to: `/booking/${b.placeId}`,
      };
    });
  const walk: PendingItem[] = walks
    .filter((b) => b.at > now)
    .map((b) => {
      const w = walkers.find((x) => x.id === b.walkerId);
      return {
        id: b.id,
        kind: 'walk' as const,
        title: `Paseo con ${w?.name ?? 'paseaperros'}`,
        detail: w?.neighborhood ?? 'Paseo',
        when: `${b.dateLabel} · ${b.time}`,
        at: b.at,
        to: `/walkers/${b.walkerId}`,
      };
    });
  return [...vet, ...walk].sort((a, b) => a.at - b.at);
}
