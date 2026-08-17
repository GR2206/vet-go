import type { Product, ShopDailyOffer } from '../data/types';

export function liveOffers(offers: ShopDailyOffer[], now = Date.now()) {
  return offers.filter((o) => o.until > now && o.discountPct > 0);
}

export function applyOffersToProducts(list: Product[], offers: ShopDailyOffer[], now = Date.now()): Product[] {
  const live = liveOffers(offers, now);
  if (!live.length) return list;
  const byProduct = new Map(live.map((o) => [o.productId, o]));
  return list.map((p) => {
    const hit = byProduct.get(p.id);
    if (!hit) return p;
    return { ...p, discountPct: hit.discountPct, featured: true };
  });
}
