import type { ShopOrder } from '@/data/types';

export const ORDER_CANCEL_MS = 2 * 60 * 1000;

export function canCancelOrder(order: ShopOrder, now = Date.now()) {
  return (
    order.deliveryStatus === 'awaiting_shop' && now - order.paidAt < ORDER_CANCEL_MS
  );
}

export function cancelSecondsLeft(order: ShopOrder, now = Date.now()) {
  if (!canCancelOrder(order, now)) return 0;
  return Math.max(0, Math.ceil((ORDER_CANCEL_MS - (now - order.paidAt)) / 1000));
}
