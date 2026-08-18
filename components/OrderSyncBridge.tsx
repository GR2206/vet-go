import { useEffect, useRef } from 'react';

import { fetchLiveCatalog } from '@/lib/live-catalog';
import { notifyOrderConfirmed, initNotifications } from '@/lib/notifications';
import { useApp } from '@/store/app-store';

export function OrderSyncBridge() {
  const { shopOrders, syncShopOrderFromLive, markOrderConfirmNotified } = useApp();
  const notifiedRef = useRef(new Set<string>());

  useEffect(() => {
    void initNotifications();
  }, []);

  useEffect(() => {
    for (const order of shopOrders) {
      if (
        order.deliveryStatus === 'confirmed' &&
        !order.confirmNotified &&
        !notifiedRef.current.has(order.id)
      ) {
        notifiedRef.current.add(order.id);
        void notifyOrderConfirmed(order.shopName ?? 'La tienda', order.id).catch(() => undefined);
        markOrderConfirmNotified(order.id);
      }
    }
  }, [shopOrders, markOrderConfirmNotified]);

  useEffect(() => {
    const active = shopOrders.some(
      (o) =>
        o.deliveryStatus === 'awaiting_shop' ||
        o.deliveryStatus === 'confirmed' ||
        ((o.deliveryStatus === 'received' || o.deliveryStatus === 'rated') &&
          !o.buyerRating &&
          !o.pendingDismissed),
    );
    if (!active) return;
    let on = true;
    const pull = async () => {
      try {
        const file = await fetchLiveCatalog();
        if (!on) return;
        for (const order of shopOrders) {
          if (order.deliveryStatus === 'cancelled') continue;
          const live = file.shops[order.shopId]?.orders?.find((o) => o.id === order.id);
          if (!live) continue;
          if (
            order.deliveryStatus === 'received' ||
            order.deliveryStatus === 'rated'
          ) {
            if (live.buyerRating || live.tutorRating) syncShopOrderFromLive(order.id, live);
            continue;
          }
          syncShopOrderFromLive(order.id, live);
        }
      } catch {
        /* panel apagado */
      }
    };
    pull();
    const t = setInterval(pull, 4000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [shopOrders, syncShopOrderFromLive]);

  return null;
}
