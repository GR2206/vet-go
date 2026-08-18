import { places } from '../../data/mock';
import { sanitizeId } from '../../lib/live-catalog-security';

const pinToShop = new Map(places.map((p) => [p.ownerPin, p.id]));
const shopIds = new Set(places.map((p) => p.id));

export function shopIdForPin(pin: string) {
  const clean = pin.replace(/\D/g, '').slice(0, 6);
  if (clean.length < 4) return null;
  return pinToShop.get(clean) ?? null;
}

export function isKnownShopId(shopId: string) {
  return shopIds.has(sanitizeId(shopId));
}

export function shopName(shopId: string) {
  return places.find((p) => p.id === shopId)?.name ?? shopId;
}
