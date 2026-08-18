import { places, professionals, services } from '@/data/mock';
import type { Booking, ShopOrder, WalkBooking } from '@/data/types';
import { walkers } from '@/data/walkers';

export type PendingItem = {
  id: string;
  kind: 'vet' | 'walk' | 'order';
  title: string;
  detail: string;
  when: string;
  at: number;
  to: string;
  order?: ShopOrder;
};

export function upcomingPendings(
  bookings: Booking[],
  walks: WalkBooking[],
  shopOrders: ShopOrder[] = [],
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
  const orders: PendingItem[] = shopOrders
    .filter((o) => {
      if (o.deliveryStatus === 'cancelled' || o.pendingDismissed) return false;
      if (o.deliveryStatus === 'awaiting_shop' || o.deliveryStatus === 'confirmed') return true;
      return Boolean(o.pendingOpen);
    })
    .map((o) => {
      const shopName = o.shopName ?? places.find((p) => p.id === o.shopId)?.name ?? 'Pedido';
      const detail = o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ');
      const when =
        o.ratedAt && o.receivedAt
          ? 'Pedido recibido · tienda calificada'
          : o.receivedAt
            ? 'Producto recibido · podés calificar la tienda'
            : o.deliveryStatus === 'confirmed'
              ? 'Pedido confirmado · lo recibirás a la brevedad'
              : 'Esperando confirmación del local';
      return {
        id: o.id,
        kind: 'order' as const,
        title: shopName,
        detail,
        when,
        at: o.confirmedAt ?? o.paidAt,
        to: '/pending',
        order: o,
      };
    });
  return [...vet, ...walk, ...orders].sort((a, b) => a.at - b.at);
}
