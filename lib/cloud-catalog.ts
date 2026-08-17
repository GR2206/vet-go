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

import type { Product } from '../data/types';
import { getFirestoreDb, isFirebaseConfigured } from './firebase';
import type { LiveCatalogFile, StockAsk } from './live-catalog';

export { isFirebaseConfigured };

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

export async function cloudFetchCatalog(): Promise<LiveCatalogFile> {
  const root = shopCol();
  if (!root) return { shops: {} };
  const shops = await getDocs(root);
  const file: LiveCatalogFile = { shops: {} };
  for (const shop of shops.docs) {
    const paused = (shop.data().paused as Record<string, boolean>) ?? {};
    const updatedAt = Number(shop.data().updatedAt ?? Date.now());
    const productsSnap = await getDocs(collection(shop.ref, 'products'));
    const asksSnap = await getDocs(collection(shop.ref, 'asks'));
    const products = productsSnap.docs.map((row) => row.data() as Product);
    const asks = asksSnap.docs
      .map((row) => row.data() as StockAsk)
      .sort((a, b) => b.at - a.at);
    file.shops[shop.id] = { products, paused, asks, updatedAt };
  }
  return file;
}

export async function cloudAskStock(input: Omit<StockAsk, 'id' | 'at'> & { id?: string; at?: number }) {
  const db = getFirestoreDb();
  if (!db) return false;
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
  await deleteDoc(doc(db, 'shops', shopId, 'asks', id));
  return true;
}

export async function cloudDeductStock(shopId: string, items: { productId: string; qty: number }[]) {
  const db = getFirestoreDb();
  if (!db) return false;
  for (const item of items) {
    const ref = doc(db, 'shops', shopId, 'products', item.productId);
    const snap = await getDoc(ref);
    if (!snap.exists()) continue;
    const stock = Math.max(0, Number(snap.data().stock ?? 0) - Math.max(0, item.qty));
    await updateDoc(ref, { stock });
  }
  return true;
}
