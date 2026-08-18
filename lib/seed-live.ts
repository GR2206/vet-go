import { products } from '../data/mock';

export const SEED_PRODUCT_IDS = new Set(products.map((p) => p.id));

export function isSeedProductId(id: string) {
  return SEED_PRODUCT_IDS.has(id);
}

export function isDemoLiveOrderId(id: string) {
  return /^ow-/.test(id);
}

export function isDemoThreadId(id: string) {
  return /-demo$/i.test(id) || /-testuser$/i.test(id);
}
