import { dailyOffers } from '@/data/daily-offers';
import { places, products } from '@/data/mock';
import type { Pet, Product } from '@/data/types';
import { formatARS, formatKm } from '@/lib/format';
import type { Coord } from '@/lib/geo';
import { haversineKm } from '@/lib/geo';
import { applyOffersToProducts } from '@/lib/offers';

const NEAR_KM = 2.4;

export type PetDeal = {
  product: Product;
  shopName: string;
  kicker: string;
  text: string;
  to: string;
  km: number;
  nearby: boolean;
};

function fitsPet(product: Product, species: Pet['species']) {
  if (!product.species || product.species === 'all') return true;
  return product.species === species;
}

function shopKm(shopId: string, from?: Coord | null) {
  const shop = places.find((p) => p.id === shopId);
  if (!shop) return 99;
  return from ? haversineKm(from, shop.coordinate) : shop.distanceKm;
}

export function nearbyShopDeals(pet: Pet | null | undefined, from?: Coord | null, catalog: Product[] = products): PetDeal[] {
  const species = pet?.species ?? 'dog';
  const shops = places
    .filter((p) => p.kind === 'petshop')
    .map((p) => ({ ...p, km: from ? haversineKm(from, p.coordinate) : p.distanceKm }))
    .sort((a, b) => a.km - b.km);

  if (!shops.length) return [];

  const nearby = shops.filter((s) => s.km <= NEAR_KM);
  const pool = nearby.length ? nearby : shops.slice(0, 1);
  const ids = new Set(pool.map((s) => s.id));
  const listed = applyOffersToProducts(catalog, dailyOffers);
  const stock = listed.filter((p) => ids.has(p.shopId) && p.stock > 0 && fitsPet(p, species));
  const promos = stock.filter((p) => (p.discountPct ?? 0) > 0);
  const picks = (promos.length ? promos : stock).sort(
    (a, b) =>
      (b.discountPct ?? 0) - (a.discountPct ?? 0) ||
      Number(b.featured) - Number(a.featured) ||
      a.price - b.price,
  );

  return picks.slice(0, 8).map((product) => {
    const shop = places.find((p) => p.id === product.shopId);
    const km = shopKm(product.shopId, from);
    const nearbyHit = km <= NEAR_KM;
    return {
      product,
      shopName: shop?.name ?? 'Market',
      kicker: product.discountPct ? `${product.discountPct}% OFF` : 'Recomendado',
      text: nearbyHit
        ? `${product.name} · ${formatARS(product.price)}`
        : `${product.name} · lo más cerca, a ${formatKm(km)}`,
      to: `/shop/${product.shopId}`,
      km,
      nearby: nearbyHit,
    };
  });
}

export function bestDealFor(pet: Pet | null | undefined, from?: Coord | null, catalog: Product[] = products): PetDeal | null {
  return nearbyShopDeals(pet, from, catalog)[0] ?? null;
}
