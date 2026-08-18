import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import type { Product, ShopMessage, ShopThread } from '../data/types';
import { ensureOwnerSignedIn, ensureTutorSignedIn, firebaseUid } from './firebase-auth';
import { getFirestoreDb, isFirebaseConfigured } from './firebase';
import type { LiveCatalogFile, LiveShopOrder, LiveShopThread, LiveShopCatalog, StockAsk } from './live-catalog';

export { isFirebaseConfigured };

function forFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function shopCol() {
  const db = getFirestoreDb();
  if (!db) return null;
  return collection(db, 'shops');
}

export async function cloudPublishCatalog(
  shopId: string,
  products: Product[],
  paused: Record<string, boolean>,
) {
  const db = getFirestoreDb();
  if (!db) return false;
  await ensureOwnerSignedIn(shopId);
  const shopRef = doc(db, 'shops', shopId);
  await setDoc(
    shopRef,
    { paused, updatedAt: Date.now(), syncedAt: serverTimestamp() },
    { merge: true },
  );
  const existing = await getDocs(collection(db, 'shops', shopId, 'products'));
  const keep = new Set(products.map((p) => p.id));
  const batch = writeBatch(db);
  let n = 0;
  for (const row of existing.docs) {
    if (!keep.has(row.id)) {
      batch.delete(row.ref);
      n += 1;
    }
  }
  for (const product of products) {
    batch.set(doc(db, 'shops', shopId, 'products', product.id), product);
    n += 1;
    if (n >= 400) {
      await batch.commit();
      n = 0;
    }
  }
  if (n) await batch.commit();
  return true;
}

async function readThread(shopId: string, row: { id: string; ref: { path: string }; data: () => Record<string, unknown> }): Promise<ShopThread> {
  const db = getFirestoreDb()!;
  const meta = row.data() as Omit<ShopThread, 'messages'>;
  const msgsSnap = await getDocs(collection(db, 'shops', shopId, 'threads', row.id, 'messages'));
  const messages = msgsSnap.docs
    .map((m) => m.data() as ShopMessage)
    .sort((a, b) => a.at - b.at);
  return {
    id: row.id,
    shopId,
    userName: meta.userName ?? 'Tutor',
    buyerUid: meta.buyerUid ? String(meta.buyerUid) : undefined,
    petName: meta.petName ? String(meta.petName) : undefined,
    petSpecies: meta.petSpecies === 'cat' || meta.petSpecies === 'dog' ? meta.petSpecies : undefined,
    messages,
    updatedAt: Number(meta.updatedAt ?? 0),
    archived: Boolean(meta.archived),
  };
}

export async function cloudFetchPublicCatalog(): Promise<LiveCatalogFile> {
  const root = shopCol();
  if (!root) return { shops: {} };
  const shops = await getDocs(root);
  const file: LiveCatalogFile = { shops: {} };
  for (const shop of shops.docs) {
    const paused = (shop.data().paused as Record<string, boolean>) ?? {};
    const updatedAt = Number(shop.data().updatedAt ?? Date.now());
    const productsSnap = await getDocs(collection(shop.ref, 'products'));
    const products = productsSnap.docs.map((row) => row.data() as Product);
    file.shops[shop.id] = { products, paused, asks: [], orders: [], threads: [], updatedAt };
  }
  return file;
}

export async function cloudFetchShopLive(shopId: string): Promise<LiveCatalogFile> {
  const db = getFirestoreDb();
  if (!db) return { shops: {} };
  await ensureOwnerSignedIn(shopId);
  const shopRef = doc(db, 'shops', shopId);
  const shop = await getDoc(shopRef);
  const paused = (shop.data()?.paused as Record<string, boolean>) ?? {};
  const updatedAt = Number(shop.data()?.updatedAt ?? Date.now());
  const productsSnap = await getDocs(collection(shopRef, 'products'));
  const asksSnap = await getDocs(collection(shopRef, 'asks'));
  const ordersSnap = await getDocs(collection(shopRef, 'orders'));
  const threadsSnap = await getDocs(collection(shopRef, 'threads'));
  const products = productsSnap.docs.map((row) => row.data() as Product);
  const asks = asksSnap.docs
    .map((row) => row.data() as StockAsk)
    .sort((a, b) => b.at - a.at);
  const orders = ordersSnap.docs
    .map((row) => row.data() as LiveShopOrder)
    .sort((a, b) => b.paidAt - a.paidAt);
  const threads: LiveShopThread[] = [];
  for (const row of threadsSnap.docs) {
    threads.push(await readThread(shopId, row));
  }
  threads.sort((a, b) => b.updatedAt - a.updatedAt);
  const live: LiveShopCatalog = { products, paused, asks, orders, threads, updatedAt };
  return { shops: { [shopId]: live } };
}

/** @deprecated Prefer cloudFetchPublicCatalog / cloudFetchShopLive */
export async function cloudFetchCatalog(): Promise<LiveCatalogFile> {
  return cloudFetchPublicCatalog();
}

export async function cloudGetOrder(shopId: string, orderId: string) {
  const db = getFirestoreDb();
  if (!db) return null;
  await ensureTutorSignedIn();
  const snap = await getDoc(doc(db, 'shops', shopId, 'orders', orderId));
  if (!snap.exists()) return null;
  return snap.data() as LiveShopOrder;
}

export async function cloudGetThread(shopId: string, threadId: string) {
  const db = getFirestoreDb();
  if (!db) return null;
  await ensureTutorSignedIn();
  const snap = await getDoc(doc(db, 'shops', shopId, 'threads', threadId));
  if (!snap.exists()) return null;
  return readThread(shopId, snap);
}

export async function cloudAskStock(input: Omit<StockAsk, 'id' | 'at'> & { id?: string; at?: number }) {
  const db = getFirestoreDb();
  if (!db) return false;
  await ensureTutorSignedIn();
  const id = input.id ?? `ask-${Date.now()}`;
  const at = input.at ?? Date.now();
  const payload: StockAsk = {
    id,
    shopId: input.shopId,
    productId: input.productId,
    productName: input.productName,
    tutorName: input.tutorName,
    at,
  };
  await setDoc(doc(db, 'shops', input.shopId, 'asks', id), payload);
  return true;
}

export async function cloudDismissAsk(shopId: string, id: string) {
  const db = getFirestoreDb();
  if (!db) return false;
  await ensureOwnerSignedIn(shopId);
  await deleteDoc(doc(db, 'shops', shopId, 'asks', id));
  return true;
}

export async function cloudDeductStock(shopId: string, items: { productId: string; qty: number }[]) {
  const db = getFirestoreDb();
  if (!db) return false;
  await ensureTutorSignedIn();
  for (const item of items) {
    const ref = doc(db, 'shops', shopId, 'products', item.productId);
    const snap = await getDoc(ref);
    if (!snap.exists()) continue;
    const stock = Math.max(0, Number(snap.data().stock ?? 0) - Math.max(0, item.qty));
    await updateDoc(ref, { stock });
  }
  return true;
}

export async function cloudPushOrder(order: LiveShopOrder) {
  const db = getFirestoreDb();
  if (!db) return false;
  await ensureTutorSignedIn();
  const uid = firebaseUid();
  const payload = forFirestore({
    id: order.id,
    shopId: order.shopId,
    shopName: order.shopName || '',
    buyer: order.buyer || order.shipping?.fullName || 'Tutor',
    buyerUid: uid,
    items: order.items ?? [],
    gross: Number(order.gross) || 0,
    fee: Number(order.fee) || 0,
    net: Number(order.net) || 0,
    method: order.method || 'mercadopago',
    payKind: order.payKind || '',
    cardBrand: order.cardBrand || '',
    cardLast4: order.cardLast4 || '',
    deliveryStatus: order.deliveryStatus || 'awaiting_shop',
    confirmedAt: order.confirmedAt || 0,
    receivedAt: order.receivedAt || 0,
    ownerArchived: Boolean(order.ownerArchived),
    tutorRating: order.tutorRating,
    buyerRating: order.buyerRating,
    shipping: order.shipping ?? {},
    createdAt: Number(order.createdAt) || Date.now(),
    paidAt: Number(order.paidAt) || Date.now(),
  });
  await setDoc(doc(db, 'shops', order.shopId, 'orders', order.id), payload);
  await setDoc(doc(db, 'shops', order.shopId), { updatedAt: Date.now() }, { merge: true });
  return true;
}

export async function cloudPatchOrder(
  shopId: string,
  orderId: string,
  patch: Partial<LiveShopOrder>,
) {
  const db = getFirestoreDb();
  if (!db) return false;
  if (!firebaseUid()) await ensureTutorSignedIn();
  await setDoc(doc(db, 'shops', shopId, 'orders', orderId), forFirestore(patch), { merge: true });
  await setDoc(doc(db, 'shops', shopId), { updatedAt: Date.now() }, { merge: true });
  return true;
}

export async function cloudPushChatMessage(input: {
  shopId: string;
  threadId: string;
  userName: string;
  petName?: string;
  petSpecies?: 'dog' | 'cat';
  message: ShopMessage;
}) {
  const db = getFirestoreDb();
  if (!db) throw new Error('firestore_unavailable');
  const { shopId, threadId, userName, petName, petSpecies, message } = input;
  if (message.from === 'shop') await ensureOwnerSignedIn(shopId);
  else await ensureTutorSignedIn();
  const safeThreadId = threadId.replace(/[^\w-]/g, '').slice(0, 120) || `th-${shopId}-tutor`;
  const payload: ShopMessage = {
    id: String(message.id),
    shopId: String(message.shopId),
    from: message.from === 'shop' ? 'shop' : 'user',
    author: String(message.author ?? userName).slice(0, 120),
    text: String(message.text).slice(0, 800),
    at: Number(message.at) || Date.now(),
  };
  await setDoc(doc(db, 'shops', shopId), { updatedAt: Date.now() }, { merge: true });
  const threadPatch: Record<string, unknown> = {
    id: safeThreadId,
    shopId,
    updatedAt: payload.at,
    archived: false,
  };
  if (payload.from === 'user') {
    threadPatch.userName = String(userName).slice(0, 120) || payload.author;
    const uid = firebaseUid();
    if (uid) threadPatch.buyerUid = uid;
  }
  if (petName) threadPatch.petName = String(petName).slice(0, 80);
  if (petSpecies === 'dog' || petSpecies === 'cat') threadPatch.petSpecies = petSpecies;
  await setDoc(doc(db, 'shops', shopId, 'threads', safeThreadId), threadPatch, { merge: true });
  await setDoc(
    doc(db, 'shops', shopId, 'threads', safeThreadId, 'messages', payload.id),
    forFirestore(payload),
  );
  return true;
}

export async function cloudPatchThreadPet(input: {
  shopId: string;
  threadId: string;
  petName?: string;
  petSpecies?: 'dog' | 'cat';
}) {
  const db = getFirestoreDb();
  if (!db) return false;
  await ensureTutorSignedIn();
  const { shopId, threadId, petName, petSpecies } = input;
  const safeThreadId = threadId.replace(/[^\w-]/g, '').slice(0, 120) || `th-${shopId}-tutor`;
  const patch: Record<string, unknown> = {};
  if (petName?.trim()) patch.petName = String(petName).trim().slice(0, 80);
  if (petSpecies === 'dog' || petSpecies === 'cat') patch.petSpecies = petSpecies;
  if (!Object.keys(patch).length) return false;
  try {
    await updateDoc(doc(db, 'shops', shopId, 'threads', safeThreadId), patch);
    return true;
  } catch {
    return false;
  }
}
