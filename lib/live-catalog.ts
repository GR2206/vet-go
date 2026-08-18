import type { Product, ShopMessage, ShopThread } from '../data/types';
import { liveCatalogUrl } from './live-api-url';
import {
  cloudAskStock,
  cloudDeductStock,
  cloudFetchCatalog,
  cloudPatchOrder,
  cloudPatchThreadPet,
  cloudPublishCatalog,
  cloudPushChatMessage,
  cloudPushOrder,
  isFirebaseConfigured,
} from './cloud-catalog';
import { mergeLiveCatalogFiles } from './merge-catalog';
import { isAppAction, isOwnerAction, liveAppWriteKeyFromEnv } from './live-catalog-security';

export { liveCatalogUrl, resolveLiveApiBase } from './live-api-url';
export { isFirebaseConfigured, getFirestoreDb } from './firebase';

export type StockAsk = {
  id: string;
  shopId: string;
  productId: string;
  productName: string;
  tutorName: string;
  at: number;
};

export type LiveShopOrder = {
  id: string;
  shopId: string;
  shopName?: string;
  buyer: string;
  items: { productId: string; name: string; qty: number; unitPrice: number }[];
  gross: number;
  fee: number;
  net: number;
  method: string;
  payKind?: string;
  cardBrand?: string;
  cardLast4?: string;
  deliveryStatus?: import('../data/types').OrderDeliveryStatus;
  ownerArchived?: boolean;
  confirmedAt?: number;
  receivedAt?: number;
  tutorRating?: import('../data/types').OrderRating;
  buyerRating?: import('../data/types').OrderRating;
  shipping: import('../data/types').ShippingAddress;
  createdAt: number;
  paidAt: number;
};

export type LiveShopThread = ShopThread;

export type LiveShopCatalog = {
  products: Product[];
  paused: Record<string, boolean>;
  asks: StockAsk[];
  orders?: LiveShopOrder[];
  threads?: LiveShopThread[];
  updatedAt: number;
};

export type LiveCatalogFile = {
  shops: Record<string, LiveShopCatalog>;
};

export const EMPTY_LIVE_CATALOG: LiveCatalogFile = { shops: {} };

function readEnv(key: string) {
  if (typeof process !== 'undefined') {
    const v = process.env[key] ?? process.env[`EXPO_PUBLIC_${key}`] ?? process.env[`VITE_${key}`];
    if (v) return v.trim();
  }
  return '';
}

export function liveAppWriteKey() {
  return liveAppWriteKeyFromEnv((k) => readEnv(k));
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

type PostOpts = {
  owner?: boolean;
  app?: boolean;
};

async function postLive(body: Record<string, unknown>, opts: PostOpts): Promise<LiveCatalogFile | null> {
  const action = String(body.action ?? '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.app || isAppAction(action)) {
    const key = liveAppWriteKey();
    if (!key) {
      console.warn('[PETS&GO] Falta EXPO_PUBLIC_LIVE_APP_WRITE_KEY para escribir en el catálogo.');
      return null;
    }
    headers['X-Live-App-Key'] = key;
  }
  try {
    const res = await fetch(liveCatalogUrl(), {
      method: 'POST',
      headers,
      credentials: opts.owner || isOwnerAction(action) ? 'include' : 'omit',
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchLocalLiveCatalog(): Promise<LiveCatalogFile | null> {
  try {
    const res = await fetch(liveCatalogUrl());
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchLiveCatalog(): Promise<LiveCatalogFile> {
  const parts: LiveCatalogFile[] = [];
  if (isFirebaseConfigured()) {
    try {
      parts.push(await cloudFetchCatalog());
    } catch (err) {
      console.warn('[PETS&GO] cloudFetchCatalog failed', err);
    }
  }
  const local = await fetchLocalLiveCatalog();
  if (local) parts.push(local);
  if (!parts.length) throw new Error('live-catalog');
  return mergeLiveCatalogFiles(parts);
}

export type LivePushResult =
  | { ok: true }
  | { ok: false; reason: 'missing_key' | 'network' | 'http' | 'no_backend'; status?: number };

export async function pushChatMessage(input: {
  shopId: string;
  threadId: string;
  userName: string;
  petName?: string;
  petSpecies?: 'dog' | 'cat';
  message: ShopMessage;
}): Promise<LivePushResult> {
  if (isFirebaseConfigured()) {
    try {
      const ok = await cloudPushChatMessage(input);
      if (ok) return { ok: true };
    } catch (err) {
      console.warn('[PETS&GO] cloudPushChatMessage failed', err);
    }
  }
  const key = liveAppWriteKey();
  if (!key) {
    return isFirebaseConfigured() ? { ok: false, reason: 'no_backend' } : { ok: false, reason: 'missing_key' };
  }
  try {
    const res = await fetch(liveCatalogUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Live-App-Key': key,
      },
      body: JSON.stringify({
        action: 'chat',
        shopId: input.shopId,
        threadId: input.threadId,
        userName: input.userName,
        petName: input.petName,
        petSpecies: input.petSpecies,
        message: input.message,
      }),
    });
    if (!res.ok) return { ok: false, reason: 'http', status: res.status };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

export async function pushThreadPet(input: {
  shopId: string;
  threadId: string;
  petName?: string;
  petSpecies?: 'dog' | 'cat';
}): Promise<boolean> {
  if (isFirebaseConfigured()) {
    try {
      return await cloudPatchThreadPet(input);
    } catch (err) {
      console.warn('[PETS&GO] cloudPatchThreadPet failed', err);
    }
  }
  return false;
}

export function publishShopCatalog(
  shopId: string,
  products: Product[],
  paused: Record<string, boolean>,
) {
  if (isFirebaseConfigured()) void cloudPublishCatalog(shopId, products, paused);
  return postLive({ action: 'publish', shopId, products, paused }, { owner: true });
}

export function askShopStock(input: Omit<StockAsk, 'id' | 'at'> & { id?: string; at?: number }) {
  if (isFirebaseConfigured()) void cloudAskStock(input);
  return postLive({ action: 'ask', ...input }, { app: true });
}

export function dismissShopAsk(shopId: string, id: string) {
  return postLive({ action: 'dismiss', shopId, id }, { owner: true });
}

export function deductShopStock(shopId: string, items: { productId: string; qty: number }[]) {
  if (isFirebaseConfigured()) void cloudDeductStock(shopId, items);
  return postLive({ action: 'deduct', shopId, items }, { app: true });
}

export function shopOrderToLive(order: import('../data/types').ShopOrder): LiveShopOrder {
  return {
    id: order.id,
    shopId: order.shopId,
    shopName: order.shopName,
    buyer: order.shipping.fullName,
    items: order.items,
    gross: order.gross,
    fee: order.fee,
    net: order.net,
    method: order.method,
    payKind: order.payKind,
    cardBrand: order.cardBrand,
    cardLast4: order.cardLast4,
    deliveryStatus: order.deliveryStatus,
    confirmedAt: order.confirmedAt,
    receivedAt: order.receivedAt,
    tutorRating: order.tutorRating,
    buyerRating: order.buyerRating,
    shipping: order.shipping,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
  };
}

export function pushShopOrder(order: import('../data/types').ShopOrder) {
  const live = shopOrderToLive(order);
  if (isFirebaseConfigured()) {
    void cloudPushOrder(live).catch((err) => console.warn('[PETS&GO] cloudPushOrder failed', err));
  }
  return postLive({ action: 'order', shopId: order.shopId, order: live }, { app: true });
}

export function confirmLiveOrder(shopId: string, orderId: string) {
  const patch = { deliveryStatus: 'confirmed' as const, confirmedAt: Date.now() };
  if (isFirebaseConfigured()) void cloudPatchOrder(shopId, orderId, patch);
  return postLive({ action: 'confirm_order', shopId, orderId }, { owner: true });
}

export function archiveLiveOrder(shopId: string, orderId: string, archived: boolean) {
  if (isFirebaseConfigured()) void cloudPatchOrder(shopId, orderId, { ownerArchived: archived });
  return postLive({ action: 'archive_order', shopId, orderId, archived }, { owner: true });
}

export function receiveLiveOrder(shopId: string, orderId: string) {
  const patch = { deliveryStatus: 'received' as const, receivedAt: Date.now() };
  if (isFirebaseConfigured()) void cloudPatchOrder(shopId, orderId, patch);
  return postLive({ action: 'receive_order', shopId, orderId }, { app: true });
}

export function rateLiveOrder(
  shopId: string,
  orderId: string,
  rating?: { rating: number; text?: string },
) {
  const tutorRating = rating
    ? {
        rating: Math.min(5, Math.max(1, Math.round(rating.rating))),
        text: (rating.text ?? '').trim().slice(0, 400),
        at: Date.now(),
      }
    : undefined;
  const patch = {
    deliveryStatus: 'rated' as const,
    ...(tutorRating ? { tutorRating } : {}),
  };
  if (isFirebaseConfigured()) void cloudPatchOrder(shopId, orderId, patch);
  return postLive(
    { action: 'rate_order', shopId, orderId, rating: tutorRating?.rating, text: tutorRating?.text },
    { app: true },
  );
}

export function rateLiveBuyer(
  shopId: string,
  orderId: string,
  rating: { rating: number; text?: string },
) {
  const buyerRating = {
    rating: Math.min(5, Math.max(1, Math.round(rating.rating))),
    text: (rating.text ?? '').trim().slice(0, 400),
    at: Date.now(),
  };
  if (isFirebaseConfigured()) void cloudPatchOrder(shopId, orderId, { buyerRating });
  return postLive(
    { action: 'rate_buyer', shopId, orderId, rating: buyerRating.rating, text: buyerRating.text },
    { owner: true },
  );
}

export function cancelLiveOrder(shopId: string, orderId: string) {
  if (isFirebaseConfigured()) void cloudPatchOrder(shopId, orderId, { deliveryStatus: 'cancelled' });
  return postLive({ action: 'cancel_order', shopId, orderId }, { app: true });
}

export function chatThreadId(shopId: string, tutorKey: string) {
  const slug = tutorKey
    .toLowerCase()
    .replace(/[^\w-]/g, '')
    .slice(0, 48) || 'tutor';
  return `th-${shopId}-${slug}`;
}

export function replyLiveChat(shopId: string, threadId: string, message: ShopMessage) {
  if (isFirebaseConfigured()) {
    void cloudPushChatMessage({
      shopId,
      threadId,
      userName: '',
      message,
    });
  }
  return postLive({ action: 'chat_reply', shopId, threadId, message }, { owner: true });
}

export type OwnerSession = { ok: true; shopId: string; shopName: string } | { ok: false };

export async function ownerLogin(pin: string): Promise<OwnerSession & { error?: string }> {
  try {
    const res = await fetch('/api/owner/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    return res.json();
  } catch {
    return { ok: false, error: 'No pudimos validar el PIN.' };
  }
}

export async function ownerLogout() {
  try {
    await fetch('/api/owner/logout', { method: 'POST', credentials: 'include' });
  } catch {
    /* offline */
  }
}

export async function ownerSession(): Promise<OwnerSession> {
  try {
    const res = await fetch('/api/owner/session', { credentials: 'include' });
    return res.json();
  } catch {
    return { ok: false };
  }
}
