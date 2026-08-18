import fs from 'node:fs';

import {
  clampInt,
  isAppAction,
  isOwnerAction,
  liveAppWriteKeyFromEnv,
  sanitizeId,
  sanitizeText,
} from '../../lib/live-catalog-security';
import { isKnownShopId, shopIdForPin, shopName } from './pin-registry';
import {
  clearSessionCookie,
  clientIp,
  parseCookie,
  rateLimit,
  SESSION_COOKIE,
  sessionCookieHeader,
  signOwnerSession,
  verifyOwnerSession,
} from './security';

export type LiveFile = {
  shops: Record<
    string,
    {
      products: unknown[];
      paused: Record<string, boolean>;
      asks: {
        id: string;
        shopId: string;
        productId: string;
        productName: string;
        tutorName: string;
        at: number;
      }[];
      orders?: unknown[];
      threads?: unknown[];
      updatedAt: number;
    }
  >;
};

type EnvGet = (key: string) => string | undefined;

type HandlerOpts = {
  liveFile: string;
  getEnv: EnvGet;
  isSecure: boolean;
};

const MAX_BODY = 512 * 1024;

function readLive(path: string): LiveFile {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8')) as LiveFile;
  } catch {
    return { shops: {} };
  }
}

function writeLive(path: string, db: LiveFile) {
  fs.writeFileSync(path, JSON.stringify(db, null, 2));
}

function shopOf(db: LiveFile, shopId: string) {
  db.shops[shopId] ??= { products: [], paused: {}, asks: [], orders: [], threads: [], updatedAt: Date.now() };
  db.shops[shopId].orders ??= [];
  db.shops[shopId].threads ??= [];
  return db.shops[shopId];
}

const ORDER_CANCEL_MS = 2 * 60 * 1000;

function securityHeaders(res: { setHeader: (k: string, v: string) => void }) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https:; font-src 'self' data:",
  );
}

function cors(req: { headers: Record<string, unknown> }, res: { setHeader: (k: string, v: string) => void }, withCredentials: boolean) {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.length) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (!withCredentials) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Live-App-Key');
  if (withCredentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
}

function readBody(req: { on: (ev: string, cb: (c: Buffer) => void) => void }): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('body_too_large'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function appKeyOk(req: { headers: Record<string, unknown> }, getEnv: EnvGet) {
  const expected = liveAppWriteKeyFromEnv(getEnv);
  if (!expected) return false;
  const got = req.headers['x-live-app-key'];
  return typeof got === 'string' && got.length > 0 && got === expected;
}

function ownerSession(req: { headers: Record<string, unknown> }, getEnv: EnvGet) {
  const token = parseCookie(String(req.headers.cookie ?? ''), SESSION_COOKIE);
  return verifyOwnerSession(token, getEnv);
}

function validateProducts(raw: unknown): unknown[] | null {
  if (!Array.isArray(raw) || raw.length > 3000) return null;
  return raw.slice(0, 3000).map((row) => {
    const p = row as Record<string, unknown>;
    return {
      ...p,
      id: sanitizeId(p.id),
      shopId: sanitizeId(p.shopId),
      name: sanitizeText(p.name, 160),
      category: sanitizeText(p.category, 80),
      description: sanitizeText(p.description, 1200),
      unit: sanitizeText(p.unit, 24),
      price: clampInt(p.price, 0, 99_999_999),
      stock: clampInt(p.stock, 0, 999_999),
      image: sanitizeText(p.image, 800_000),
    };
  });
}

function validateOrder(raw: unknown) {
  const o = raw as Record<string, unknown>;
  if (!o || typeof o !== 'object') return null;
  const id = sanitizeId(o.id);
  const shopId = sanitizeId(o.shopId);
  if (!id || !shopId) return null;
  const items = Array.isArray(o.items) ? o.items.slice(0, 50) : [];
  const deliveryRaw = String(o.deliveryStatus ?? 'awaiting_shop');
  const deliveryStatus =
    deliveryRaw === 'confirmed' ||
    deliveryRaw === 'received' ||
    deliveryRaw === 'rated' ||
    deliveryRaw === 'cancelled'
      ? deliveryRaw
      : 'awaiting_shop';
  const payKindRaw = sanitizeText(o.payKind, 10);
  const cardBrandRaw = sanitizeText(o.cardBrand, 20);
  const cardLast4Raw = sanitizeText(o.cardLast4, 4);
  return {
    id,
    shopId,
    shopName: sanitizeText(o.shopName, 120) || undefined,
    buyer: sanitizeText(o.buyer, 120),
    gross: clampInt(o.gross, 0, 99_999_999),
    fee: clampInt(o.fee, 0, 99_999_999),
    net: clampInt(o.net, 0, 99_999_999),
    method: sanitizeText(o.method, 40),
    payKind: payKindRaw === 'credit' || payKindRaw === 'debit' ? payKindRaw : undefined,
    cardBrand:
      cardBrandRaw === 'visa' ||
      cardBrandRaw === 'mastercard' ||
      cardBrandRaw === 'amex' ||
      cardBrandRaw === 'unknown'
        ? cardBrandRaw
        : undefined,
    cardLast4: /^\d{4}$/.test(cardLast4Raw) ? cardLast4Raw : undefined,
    deliveryStatus,
    confirmedAt: clampInt(o.confirmedAt, 0, 9_999_999_999_999, 0) || undefined,
    receivedAt: clampInt(o.receivedAt, 0, 9_999_999_999_999, 0) || undefined,
    paidAt: clampInt(o.paidAt, 0, 9_999_999_999_999),
    createdAt: clampInt(o.createdAt, 0, 9_999_999_999_999),
    items: items.map((it) => {
      const row = it as Record<string, unknown>;
      return {
        productId: sanitizeId(row.productId),
        name: sanitizeText(row.name, 160),
        qty: clampInt(row.qty, 1, 999),
        unitPrice: clampInt(row.unitPrice, 0, 99_999_999),
      };
    }),
    shipping: o.shipping,
  };
}

function validateChatMessage(raw: unknown) {
  const m = raw as Record<string, unknown>;
  if (!m || typeof m !== 'object') return null;
  const id = sanitizeId(m.id);
  const shopId = sanitizeId(m.shopId);
  const from = m.from === 'shop' ? 'shop' : m.from === 'user' ? 'user' : null;
  if (!id || !shopId || !from) return null;
  const text = sanitizeText(m.text, 800);
  if (text.length < 1) return null;
  return {
    id,
    shopId,
    from,
    author: sanitizeText(m.author, 120),
    text,
    at: clampInt(m.at, 0, 9_999_999_999_999, Date.now()),
  };
}

function upsertChatMessage(
  row: { threads?: unknown[]; updatedAt: number },
  shopId: string,
  threadId: string,
  userName: string,
  msg: NonNullable<ReturnType<typeof validateChatMessage>>,
  petName?: string,
  petSpecies?: 'dog' | 'cat',
) {
  const threads = row.threads as {
    id: string;
    shopId: string;
    userName: string;
    petName?: string;
    petSpecies?: 'dog' | 'cat';
    messages: typeof msg[];
    updatedAt: number;
    archived: boolean;
  }[];
  let thread = threads.find((t) => t.id === threadId);
  if (!thread) {
    thread = {
      id: threadId,
      shopId,
      userName: sanitizeText(userName, 120) || msg.author || 'Tutor',
      messages: [],
      updatedAt: msg.at,
      archived: false,
    };
    if (petName) thread.petName = petName;
    if (petSpecies) thread.petSpecies = petSpecies;
    threads.unshift(thread);
    if (threads.length > 300) threads.length = 300;
  }
  if (petName) thread.petName = petName;
  if (petSpecies) thread.petSpecies = petSpecies;
  thread.messages ??= [];
  if (!thread.messages.some((m) => m.id === msg.id)) {
    thread.messages.push(msg);
    if (thread.messages.length > 200) thread.messages.splice(0, thread.messages.length - 200);
  }
  thread.updatedAt = msg.at;
  thread.archived = false;
  row.updatedAt = Date.now();
}

export function createLiveCatalogMiddleware(opts: HandlerOpts) {
  const { liveFile, getEnv, isSecure } = opts;

  return async (
    req: {
      url?: string;
      method?: string;
      headers: Record<string, unknown>;
      socket?: { remoteAddress?: string };
      on: (ev: string, cb: (c: Buffer) => void) => void;
    },
    res: {
      statusCode: number;
      setHeader: (k: string, v: string) => void;
      end: (body?: string) => void;
    },
    next: () => void,
  ) => {
    const url = req.url?.split('?')[0] ?? '';
    if (!url.startsWith('/api/')) return next();

    securityHeaders(res);

    if (url === '/api/owner/login') {
      cors(req, res, true);
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end();
        return;
      }
      try {
        const ip = clientIp(req);
        const limit = rateLimit(`login:${ip}`, 12, 15 * 60 * 1000);
        if (!limit.ok) {
          res.statusCode = 429;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'Demasiados intentos. Esperá unos minutos.' }));
          return;
        }
        const raw = await readBody(req);
        const body = JSON.parse(raw || '{}') as { pin?: string };
        const shopId = shopIdForPin(String(body.pin ?? ''));
        if (!shopId) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'PIN inválido.' }));
          return;
        }
        const token = signOwnerSession(shopId, getEnv);
        res.setHeader('Set-Cookie', sessionCookieHeader(token, isSecure));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, shopId, shopName: shopName(shopId) }));
      } catch {
        res.statusCode = 400;
        res.end('{"ok":false}');
      }
      return;
    }

    if (url === '/api/owner/logout') {
      cors(req, res, true);
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      res.setHeader('Set-Cookie', clearSessionCookie(isSecure));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (url === '/api/owner/session') {
      cors(req, res, true);
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      const session = ownerSession(req, getEnv);
      res.setHeader('Content-Type', 'application/json');
      if (!session) {
        res.end(JSON.stringify({ ok: false }));
        return;
      }
      res.end(JSON.stringify({ ok: true, shopId: session.shopId, shopName: shopName(session.shopId) }));
      return;
    }

    if (url !== '/api/live-catalog') return next();

    const withCreds = req.method === 'GET' || isOwnerAction(String((req as { _action?: string })._action));
    cors(req, res, Boolean(ownerSession(req, getEnv)));

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const send = (obj: unknown, code = 200) => {
      res.statusCode = code;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(obj));
    };

    if (req.method === 'GET') {
      const local = readLive(liveFile);
      try {
        const { cloudFetchCatalog } = await import('../../lib/cloud-catalog');
        const { mergeLiveCatalogFiles } = await import('../../lib/merge-catalog');
        const cloud = await cloudFetchCatalog();
        send(mergeLiveCatalogFiles([cloud, local as import('../../lib/live-catalog').LiveCatalogFile]));
      } catch (err) {
        console.warn('[live-catalog] cloud merge failed', err);
        send(local);
      }
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end();
      return;
    }

    const ip = clientIp(req);
    const postLimit = rateLimit(`post:${ip}`, 120, 60 * 1000);
    if (!postLimit.ok) {
      send({ error: 'rate_limited' }, 429);
      return;
    }

    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw || '{}') as Record<string, unknown>;
      const action = String(body.action ?? '');
      const shopId = sanitizeId(body.shopId);

      if (!action || !shopId || !isKnownShopId(shopId)) {
        send({ error: 'invalid_request' }, 400);
        return;
      }

      if (isOwnerAction(action)) {
        const session = ownerSession(req, getEnv);
        if (!session || session.shopId !== shopId) {
          send({ error: 'owner_auth_required' }, 401);
          return;
        }
      } else if (isAppAction(action)) {
        if (!appKeyOk(req, getEnv)) {
          send({ error: 'app_key_required' }, 401);
          return;
        }
      } else {
        send({ error: 'unknown_action' }, 400);
        return;
      }

      const db = readLive(liveFile);

      if (action === 'publish') {
        const products = validateProducts(body.products);
        if (!products) {
          send({ error: 'invalid_products' }, 400);
          return;
        }
        const row = shopOf(db, shopId);
        row.products = products;
        row.paused =
          body.paused && typeof body.paused === 'object'
            ? (body.paused as Record<string, boolean>)
            : row.paused;
        row.updatedAt = Date.now();
      } else if (action === 'ask') {
        const row = shopOf(db, shopId);
        const productId = sanitizeId(body.productId);
        const dup = row.asks.some((a) => a.productId === productId && Date.now() - a.at < 1000 * 60 * 30);
        if (!dup) {
          row.asks.unshift({
            id: sanitizeId(body.id) || `ask-${Date.now()}`,
            shopId,
            productId,
            productName: sanitizeText(body.productName, 160),
            tutorName: sanitizeText(body.tutorName, 120),
            at: clampInt(body.at, 0, 9_999_999_999_999, Date.now()),
          });
          if (row.asks.length > 500) row.asks.length = 500;
        }
        row.updatedAt = Date.now();
      } else if (action === 'dismiss') {
        const row = shopOf(db, shopId);
        const askId = sanitizeId(body.id);
        row.asks = row.asks.filter((a) => a.id !== askId);
        row.updatedAt = Date.now();
      } else if (action === 'deduct') {
        const row = shopOf(db, shopId);
        const items = Array.isArray(body.items)
          ? (body.items as { productId: string; qty: number }[]).slice(0, 100)
          : [];
        row.products = row.products.map((p) => {
          const prod = p as { id: string; stock: number };
          const hit = items.find((i) => sanitizeId(i.productId) === prod.id);
          if (!hit) return p;
          return { ...prod, stock: Math.max(0, (prod.stock ?? 0) - clampInt(hit.qty, 0, 999)) };
        });
        row.updatedAt = Date.now();
      } else if (action === 'order') {
        const row = shopOf(db, shopId);
        const order = validateOrder(body.order);
        if (!order || order.shopId !== shopId) {
          send({ error: 'invalid_order' }, 400);
          return;
        }
        if (!row.orders!.some((o) => (o as { id: string }).id === order.id)) {
          row.orders!.unshift(order);
          if (row.orders!.length > 500) row.orders!.length = 500;
        }
        row.updatedAt = Date.now();
      } else if (action === 'confirm_order') {
        const row = shopOf(db, shopId);
        const orderId = sanitizeId(body.orderId);
        const hit = row.orders!.find((o) => (o as { id: string }).id === orderId);
        if (!hit) {
          send({ error: 'order_not_found' }, 404);
          return;
        }
        const order = hit as Record<string, unknown>;
        order.deliveryStatus = 'confirmed';
        order.confirmedAt = Date.now();
        row.updatedAt = Date.now();
      } else if (action === 'archive_order') {
        const row = shopOf(db, shopId);
        const orderId = sanitizeId(body.orderId);
        const hit = row.orders!.find((o) => (o as { id: string }).id === orderId);
        if (hit) {
          (hit as Record<string, unknown>).ownerArchived = Boolean(body.archived);
          row.updatedAt = Date.now();
        }
      } else if (action === 'receive_order') {
        const row = shopOf(db, shopId);
        const orderId = sanitizeId(body.orderId);
        const hit = row.orders!.find((o) => (o as { id: string }).id === orderId);
        if (!hit) {
          send({ error: 'order_not_found' }, 404);
          return;
        }
        const order = hit as Record<string, unknown>;
        order.deliveryStatus = 'received';
        order.receivedAt = Date.now();
        row.updatedAt = Date.now();
      } else if (action === 'rate_order') {
        const row = shopOf(db, shopId);
        const orderId = sanitizeId(body.orderId);
        const hit = row.orders!.find((o) => (o as { id: string }).id === orderId);
        if (!hit) {
          send({ error: 'order_not_found' }, 404);
          return;
        }
        const order = hit as Record<string, unknown>;
        order.deliveryStatus = 'rated';
        row.updatedAt = Date.now();
      } else if (action === 'cancel_order') {
        const row = shopOf(db, shopId);
        const orderId = sanitizeId(body.orderId);
        const hit = row.orders!.find((o) => (o as { id: string }).id === orderId);
        if (!hit) {
          send({ error: 'order_not_found' }, 404);
          return;
        }
        const order = hit as Record<string, unknown>;
        const delivery = String(order.deliveryStatus ?? 'awaiting_shop');
        if (delivery !== 'awaiting_shop') {
          send({ error: 'cannot_cancel' }, 400);
          return;
        }
        const paidAt = Number(order.paidAt ?? 0);
        if (Date.now() - paidAt > ORDER_CANCEL_MS) {
          send({ error: 'cancel_window_expired' }, 400);
          return;
        }
        order.deliveryStatus = 'cancelled';
        order.cancelledAt = Date.now();
        row.updatedAt = Date.now();
      } else if (action === 'chat') {
        const row = shopOf(db, shopId);
        const threadId = sanitizeId(body.threadId);
        const msg = validateChatMessage(body.message);
        const userName = sanitizeText(body.userName, 120);
        if (!threadId || !msg || msg.shopId !== shopId) {
          send({ error: 'invalid_chat' }, 400);
          return;
        }
        const petSpecies =
          body.petSpecies === 'cat' || body.petSpecies === 'dog' ? body.petSpecies : undefined;
        upsertChatMessage(
          row,
          shopId,
          threadId,
          userName,
          msg,
          sanitizeText(body.petName, 80) || undefined,
          petSpecies,
        );
      } else if (action === 'chat_reply') {
        const row = shopOf(db, shopId);
        const threadId = sanitizeId(body.threadId);
        const msg = validateChatMessage(body.message);
        if (!threadId || !msg || msg.shopId !== shopId || msg.from !== 'shop') {
          send({ error: 'invalid_chat_reply' }, 400);
          return;
        }
        upsertChatMessage(row, shopId, threadId, '', msg);
      }

      writeLive(liveFile, db);
      send(db);
    } catch (e) {
      if (e instanceof Error && e.message === 'body_too_large') {
        send({ error: 'body_too_large' }, 413);
        return;
      }
      send({ error: 'bad_json' }, 400);
    }
  };
}
