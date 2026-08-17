import { places, services } from '@/data/mock';
import type { Booking, Pet, ShopOrder, WalkBooking } from '@/data/types';
import { walkers } from '@/data/walkers';
import { DAY_MS, esDateLabel, parseEsDate, startOfDay } from '@/lib/dates';
import { careKind } from '@/lib/wellbeing';

export type ActivityRange = 'today' | 'week' | 'month';

export type ActivityCounts = {
  walks: number;
  baths: number;
  visits: number;
  buys: number;
};

export type HistoryItem = {
  id: string;
  emoji: string;
  title: string;
  text: string;
  at: number;
  to: string;
};

export function rangeStart(range: ActivityRange, now = Date.now()) {
  const today = startOfDay(now);
  if (range === 'today') return today;
  if (range === 'week') return today - 6 * DAY_MS;
  return today - 29 * DAY_MS;
}

function inRange(at: number, from: number, now: number) {
  return at >= from && at <= now;
}

export function historyItems(
  pet: Pet | null | undefined,
  bookings: Booking[],
  walks: WalkBooking[],
  orders: ShopOrder[],
  now = Date.now(),
): HistoryItem[] {
  const petId = pet?.id;
  const out: HistoryItem[] = [];

  for (const w of walks) {
    if (petId && w.petId !== petId) continue;
    if (w.at > now) continue;
    const walker = walkers.find((x) => x.id === w.walkerId);
    out.push({
      id: `walk-${w.id}`,
      emoji: '🐾',
      title: `Paseo con ${walker?.name ?? 'paseaperros'}`,
      text: `${w.dateLabel} · ${w.time}`,
      at: w.at,
      to: `/walkers/${w.walkerId}`,
    });
  }

  for (const b of bookings) {
    if (b.status === 'cancelled') continue;
    const at = b.at ?? 0;
    if (!at || at > now) continue;
    const service = services.find((s) => s.id === b.serviceId);
    const place = places.find((p) => p.id === b.placeId);
    const kind = careKind(b.serviceId);
    out.push({
      id: `book-${b.id}`,
      emoji: kind === 'bath' ? '🛁' : kind === 'vaccine' ? '💉' : '💚',
      title: service?.name ?? 'Turno',
      text: [place?.name, `${b.dateLabel} · ${b.time}`].filter(Boolean).join(' · '),
      at,
      to: `/booking/${b.placeId}`,
    });
  }

  for (const o of orders) {
    const at = o.paidAt || o.createdAt;
    if (!at || at > now) continue;
    const n = o.items.reduce((sum, i) => sum + i.qty, 0);
    out.push({
      id: `buy-${o.id}`,
      emoji: '🛒',
      title: n === 1 ? '1 producto' : `${n} productos`,
      text: esDateLabel(at),
      at,
      to: '/cart',
    });
  }

  const bathAt = parseEsDate(pet?.lastBath);
  if (bathAt && bathAt <= now && !out.some((i) => i.emoji === '🛁' && Math.abs(i.at - bathAt) < DAY_MS)) {
    out.push({
      id: 'pet-bath',
      emoji: '🛁',
      title: 'Baño',
      text: pet?.lastBath ?? esDateLabel(bathAt),
      at: bathAt,
      to: '/booking/luna',
    });
  }

  const visitAt = parseEsDate(pet?.lastVisit);
  if (visitAt && visitAt <= now && !out.some((i) => i.emoji === '💚' && Math.abs(i.at - visitAt) < DAY_MS)) {
    out.push({
      id: 'pet-visit',
      emoji: '💚',
      title: 'Control veterinario',
      text: [pet?.vetName, pet?.lastVisit].filter(Boolean).join(' · '),
      at: visitAt,
      to: '/booking/san-martin',
    });
  }

  return out.sort((a, b) => b.at - a.at);
}

export function activityCounts(
  items: HistoryItem[],
  range: ActivityRange,
  now = Date.now(),
): ActivityCounts {
  const from = rangeStart(range, now);
  const slice = items.filter((i) => inRange(i.at, from, now));
  return {
    walks: slice.filter((i) => i.emoji === '🐾').length,
    baths: slice.filter((i) => i.emoji === '🛁').length,
    visits: slice.filter((i) => i.emoji === '💚' || i.emoji === '💉').length,
    buys: slice.filter((i) => i.emoji === '🛒').length,
  };
}

export function countsLine(c: ActivityCounts) {
  const bits = [
    c.walks === 1 ? '1 paseo' : `${c.walks} paseos`,
    c.baths === 1 ? '1 baño' : `${c.baths} baños`,
    c.visits === 1 ? '1 control' : `${c.visits} controles`,
  ];
  if (c.buys) bits.push(c.buys === 1 ? '1 compra' : `${c.buys} compras`);
  return bits.join(' · ');
}
