import type { Product } from '../data/types';
import {
  cloudAskStock,
  cloudDeductStock,
  cloudDismissAsk,
  cloudFetchCatalog,
  cloudPublishCatalog,
  isFirebaseConfigured,
} from './cloud-catalog';

export type StockAsk = {
  id: string;
  shopId: string;
  productId: string;
  productName: string;
  tutorName: string;
  at: number;
};

export type LiveShopCatalog = {
  products: Product[];
  paused: Record<string, boolean>;
  asks: StockAsk[];
  updatedAt: number;
};

export type LiveCatalogFile = {
  shops: Record<string, LiveShopCatalog>;
};

export const EMPTY_LIVE_CATALOG: LiveCatalogFile = { shops: {} };

export function liveCatalogUrl() {
  try {
    if (typeof window !== 'undefined' && /:5173\b/.test(window.location.origin)) {
      return `${window.location.origin}/api/live-catalog`;
    }
  } catch {
    /* native */
  }
  return 'http://localhost:5173/api/live-catalog';
}

export function overlayCatalog(base: Product[], file?: LiveCatalogFile | null): Product[] {
  if (!file?.shops || !Object.keys(file.shops).length) return base;
  const byShop = new Map<string, Product[]>();
  for (const p of base) {
    const list = byShop.get(p.shopId) ?? [];
    list.push(p);
    byShop.set(p.shopId, list);
  }
  for (const [shopId, live] of Object.entries(file.shops)) {
    byShop.set(
      shopId,
      live.products.filter((p) => !live.paused?.[p.id]),
    );
  }
  return [...byShop.values()].flat();
}

export function stockBand(stock: number): 'ok' | 'low' | 'critical' | 'out' {
  if (stock <= 0) return 'out';
  if (stock <= 5) return 'critical';
  if (stock <= 10) return 'low';
  return 'ok';
}

async function postLocal(body: Record<string, unknown>): Promise<LiveCatalogFile | null> {
  try {
    const res = await fetch(liveCatalogUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchLiveCatalog(): Promise<LiveCatalogFile> {
  if (isFirebaseConfigured()) {
    try {
      return await cloudFetchCatalog();
    } catch {
      /* fallback local */
    }
  }
  const res = await fetch(liveCatalogUrl());
  if (!res.ok) throw new Error('live-catalog');
  return res.json();
}

export function publishShopCatalog(
  shopId: string,
  products: Product[],
  paused: Record<string, boolean>,
) {
  if (isFirebaseConfigured()) return cloudPublishCatalog(shopId, products, paused);
  return postLocal({ action: 'publish', shopId, products, paused });
}

export function askShopStock(input: Omit<StockAsk, 'id' | 'at'> & { id?: string; at?: number }) {
  if (isFirebaseConfigured()) return cloudAskStock(input);
  return postLocal({ action: 'ask', ...input });
}

export function dismissShopAsk(shopId: string, id: string) {
  if (isFirebaseConfigured()) return cloudDismissAsk(shopId, id);
  return postLocal({ action: 'dismiss', shopId, id });
}

export function deductShopStock(shopId: string, items: { productId: string; qty: number }[]) {
  if (isFirebaseConfigured()) return cloudDeductStock(shopId, items);
  return postLocal({ action: 'deduct', shopId, items });
}
