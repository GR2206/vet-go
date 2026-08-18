import type { LiveCatalogFile, LiveShopOrder, LiveShopThread } from './live-catalog';

function deliveryRank(status?: string) {
  if (status === 'cancelled') return 4;
  if (status === 'rated') return 3;
  if (status === 'received') return 2;
  if (status === 'confirmed') return 1;
  return 0;
}

function mergeOrders(a: LiveShopOrder[] = [], b: LiveShopOrder[] = []) {
  const map = new Map<string, LiveShopOrder>();
  for (const o of [...a, ...b]) {
    const prev = map.get(o.id);
    if (!prev) {
      map.set(o.id, o);
      continue;
    }
    const newerPaid = (o.paidAt ?? 0) >= (prev.paidAt ?? 0);
    const merged = newerPaid ? { ...prev, ...o } : { ...o, ...prev };
    if (deliveryRank(prev.deliveryStatus) > deliveryRank(o.deliveryStatus)) {
      merged.deliveryStatus = prev.deliveryStatus;
      merged.confirmedAt = prev.confirmedAt ?? o.confirmedAt;
      merged.receivedAt = prev.receivedAt ?? o.receivedAt;
    }
    merged.tutorRating = prev.tutorRating || o.tutorRating;
    merged.buyerRating = prev.buyerRating || o.buyerRating;
    if (prev.ownerArchived || o.ownerArchived) merged.ownerArchived = true;
    map.set(o.id, merged);
  }
  return [...map.values()].sort((x, y) => y.paidAt - x.paidAt);
}

function mergeThreads(a: LiveShopThread[] = [], b: LiveShopThread[] = []) {
  const map = new Map<string, LiveShopThread>();
  for (const t of [...a, ...b]) {
    const prev = map.get(t.id);
    const incoming = t.messages ?? [];
    if (!prev) {
      map.set(t.id, { ...t, messages: [...incoming] });
      continue;
    }
    const prevMsgs = prev.messages ?? [];
    const ids = new Set(prevMsgs.map((m) => m.id));
    const extra = incoming.filter((m) => !ids.has(m.id));
    map.set(t.id, {
      ...prev,
      ...t,
      shopId: t.shopId || prev.shopId,
      userName: t.userName || prev.userName,
      petName: t.petName || prev.petName,
      petSpecies: t.petSpecies || prev.petSpecies,
      messages: [...prevMsgs, ...extra].sort((x, y) => x.at - y.at),
      updatedAt: Math.max(prev.updatedAt ?? 0, t.updatedAt ?? 0),
    });
  }
  return [...map.values()].sort((x, y) => y.updatedAt - x.updatedAt);
}

/** Une catálogos (p. ej. Firebase + panel local en casa). */
export function mergeLiveCatalogFiles(files: LiveCatalogFile[]): LiveCatalogFile {
  const out: LiveCatalogFile = { shops: {} };
  for (const file of files) {
    for (const [shopId, live] of Object.entries(file.shops ?? {})) {
      const prev = out.shops[shopId];
      if (!prev) {
        out.shops[shopId] = { ...live };
        continue;
      }
      out.shops[shopId] = {
        products: live.products?.length ? live.products : prev.products,
        paused: { ...prev.paused, ...live.paused },
        asks: [...(live.asks ?? []), ...(prev.asks ?? [])]
          .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
          .sort((x, y) => y.at - x.at),
        orders: mergeOrders(prev.orders, live.orders),
        threads: mergeThreads(prev.threads, live.threads),
        updatedAt: Math.max(prev.updatedAt ?? 0, live.updatedAt ?? 0),
      };
    }
  }
  return out;
}
