import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { places, services } from '@petsgo/data/mock';
import type {
  OrderDeliveryStatus,
  OrderRating,
  PaymentMethod,
  Place,
  Product,
  Professional,
  Service,
  ShippingAddress,
  ShippingKind,
  ShopDailyOffer,
  ShopMessage,
  ShopThread,
} from '@petsgo/data/types';
import { DAY_MS, endOfDay } from '@petsgo/lib/dates';
import { liveOffers } from '@petsgo/lib/offers';
import { publishShopCatalog, fetchLiveCatalog, dismissShopAsk, ownerLogin, ownerLogout, ownerSession, confirmLiveOrder, archiveLiveOrder, replyLiveChat, rateLiveBuyer, type LiveShopOrder, type LiveShopThread, type StockAsk } from '@petsgo/lib/live-catalog';
import { formatARS } from '@petsgo/lib/format';
import { isDemoLiveOrderId, isDemoThreadId, isSeedProductId } from '@petsgo/lib/seed-live';
import { mergeSheetProducts, type SheetProductRow } from '@petsgo/lib/sheet-catalog';

import { PRODUCT_PLACEHOLDER, validateProductForPublish } from './files';

const PIN_KEY = 'petsgo.owner.pin';
const SAVE_KEY = (shopId: string) => `petsgo.owner.v4.${shopId}`;
const CHAT_KEEP_MS = 30 * DAY_MS;

export type Tab = 'resumen' | 'ventas' | 'catalogo' | 'ofertas' | 'turnos' | 'equipo' | 'chat' | 'local' | 'soporte';

export type OwnerSaleStatus = 'awaiting_confirm' | 'confirmed' | 'paid_out';

export type OwnerSale = {
  id: string;
  shopId: string;
  buyer: string;
  items: { name: string; qty: number; unitPrice: number }[];
  gross: number;
  fee: number;
  net: number;
  method: string;
  payKind?: 'credit' | 'debit';
  cardBrand?: string;
  cardLast4?: string;
  paidAt: number;
  createdAt: number;
  status: OwnerSaleStatus;
  shipping: ShippingAddress;
  confirmedAt?: number;
  receivedAt?: number;
  deliveryStatus?: OrderDeliveryStatus;
  tutorRating?: OrderRating;
  buyerRating?: OrderRating;
  alertText?: string;
  archived?: boolean;
};

export type AppointmentService = 'vet' | 'vaccine' | 'bath' | 'cut';

export type OwnerAppointment = {
  id: string;
  shopId: string;
  at: number;
  time: string;
  petName: string;
  species: 'dog' | 'cat';
  kind: 'clinic' | 'grooming';
  serviceKind: AppointmentService;
  serviceName: string;
  tutorName: string;
  tutorPhone: string;
  tutorEmail: string;
  taken: boolean;
};

export type ShopNotice = {
  id: string;
  text: string;
  at: number;
};

type ShopPatch = Partial<
  Pick<Place, 'name' | 'blurb' | 'hours' | 'phone' | 'neighborhood' | 'address' | 'city' | 'paymentMethods' | 'shippingKind' | 'delivery'>
>;

type SavedShop = {
  catalog: Product[];
  drafts?: Product[];
  team: Professional[];
  offers: ShopDailyOffer[];
  paused: Record<string, boolean>;
  prices: Record<string, number>;
  cover?: string;
  avatar?: string;
  shopPatch?: ShopPatch;
  threads?: ShopThread[];
  chatAutoExpire?: boolean;
  salesAutoExpire?: boolean;
  sales?: OwnerSale[];
  seenAt?: Record<string, number>;
  supportChat?: ShopMessage[];
  appointments?: OwnerAppointment[];
  stockAsks?: StockAsk[];
  salesSeenAt?: number;
};

function loadShop(shopId: string): SavedShop | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY(shopId));
    if (!raw) return null;
    return JSON.parse(raw) as SavedShop;
  } catch {
    return null;
  }
}

function inferService(name?: string, kind?: 'clinic' | 'grooming'): AppointmentService {
  const n = (name ?? '').toLowerCase();
  if (n.includes('vacun')) return 'vaccine';
  if (n.includes('corte') && !n.includes('baño') && !n.includes('bano')) return 'cut';
  if (n.includes('baño') || n.includes('bano')) return 'bath';
  if (n.includes('consulta') || n.includes('vet')) return 'vet';
  return kind === 'grooming' ? 'bath' : 'vet';
}

function inferSpecies(name: string): 'dog' | 'cat' {
  const n = name.toLowerCase();
  if (['mora', 'lola', 'michi', 'luna', 'nina', 'mía', 'mia'].includes(n)) return 'cat';
  return 'dog';
}

const SERVICE_NAME: Record<AppointmentService, string> = {
  vet: 'Consulta',
  vaccine: 'Vacunación',
  bath: 'Baño',
  cut: 'Corte',
};

function coerceAppointment(raw: OwnerAppointment): OwnerAppointment {
  const serviceKind = raw.serviceKind ?? inferService(raw.serviceName, raw.kind);
  const species = raw.species ?? inferSpecies(raw.petName);
  const grooming = serviceKind === 'bath' || serviceKind === 'cut';
  return {
    ...raw,
    species,
    serviceKind,
    kind: grooming ? 'grooming' : 'clinic',
    serviceName: raw.serviceName || SERVICE_NAME[serviceKind],
  };
}

function lastUserMessageAt(thread: ShopThread) {
  let latest = 0;
  for (const m of thread.messages) {
    if (m.from !== 'user') continue;
    const at = Number(m.at) || 0;
    if (at > latest) latest = at;
  }
  return latest;
}

function isUnreadThread(thread: ShopThread, seenAt: Record<string, number>) {
  if (thread.archived) return false;
  const at = lastUserMessageAt(thread);
  if (!at) return false;
  return at > (seenAt[thread.id] ?? 0);
}

function pruneThreads(list: ShopThread[], autoExpire: boolean) {
  if (!autoExpire) return list;
  const cutoff = Date.now() - CHAT_KEEP_MS;
  return [...list].filter((t) => t.updatedAt >= cutoff).sort((a, b) => a.updatedAt - b.updatedAt);
}

function pruneSales(list: OwnerSale[], autoExpire: boolean) {
  if (!autoExpire) return list;
  const cutoff = Date.now() - CHAT_KEEP_MS;
  return list.filter((s) => s.paidAt >= cutoff);
}

function saleStatusRank(status: OwnerSaleStatus) {
  if (status === 'paid_out') return 2;
  if (status === 'confirmed') return 1;
  return 0;
}

function orderDeliveryRank(status?: string) {
  if (status === 'cancelled') return 4;
  if (status === 'rated') return 3;
  if (status === 'received') return 2;
  if (status === 'confirmed') return 1;
  return 0;
}

function knownDeliveryStatus(sale: OwnerSale): OrderDeliveryStatus {
  if (sale.deliveryStatus) return sale.deliveryStatus;
  return sale.status === 'confirmed' ? 'confirmed' : 'awaiting_shop';
}

function coerceSale(raw: OwnerSale): OwnerSale {
  return { ...raw, archived: raw.archived ?? false };
}

function usableLiveOrder(order: LiveShopOrder | undefined): order is LiveShopOrder {
  return Boolean(order?.id && Array.isArray(order.items) && Number(order.paidAt) > 0);
}

function liveOrderToOwnerSale(order: LiveShopOrder): OwnerSale {
  const delivery = order.deliveryStatus ?? 'awaiting_shop';
  const status: OwnerSaleStatus =
    delivery === 'confirmed' || delivery === 'received' || delivery === 'rated'
      ? 'confirmed'
      : 'awaiting_confirm';
  const buyer = order.buyer || order.shipping?.fullName || 'Tutor';
  return {
    id: order.id,
    shopId: order.shopId,
    buyer,
    items: (order.items ?? []).map((i) => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice })),
    gross: order.gross ?? 0,
    fee: order.fee ?? 0,
    net: order.net ?? 0,
    method: order.method || 'mercadopago',
    payKind: order.payKind === 'credit' || order.payKind === 'debit' ? order.payKind : undefined,
    cardBrand: order.cardBrand,
    cardLast4: order.cardLast4,
    paidAt: order.paidAt,
    createdAt: order.createdAt || order.paidAt,
    status,
    confirmedAt: order.confirmedAt,
    receivedAt: order.receivedAt,
    deliveryStatus: delivery,
    tutorRating: order.tutorRating,
    buyerRating: order.buyerRating,
    shipping: order.shipping ?? {
      firstName: buyer,
      lastName: '',
      fullName: buyer,
      dni: '',
      phone: '',
      email: '',
      street: '',
      number: '',
      floor: '',
      neighborhood: '',
      city: '',
      postalCode: '',
      notes: '',
    },
    archived: delivery === 'cancelled' || Boolean(order.ownerArchived),
  };
}

function nameFromUserMessages(messages: { from?: string; author?: string }[] = [], fallback = '') {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.from === 'user' && m.author?.trim()) return m.author.trim();
  }
  return fallback;
}

function mergeLiveThreads(prev: ShopThread[], incoming: LiveShopThread[]): ShopThread[] {
  if (!incoming.length) return prev;
  const map = new Map(prev.map((t) => [t.id, t]));
  for (const live of incoming) {
    const existing = map.get(live.id);
    const liveMsgs = live.messages ?? [];
    if (!existing) {
      map.set(live.id, {
        id: live.id,
        shopId: live.shopId,
        userName: nameFromUserMessages(liveMsgs, live.userName),
        petName: live.petName,
        petSpecies: live.petSpecies,
        messages: [...liveMsgs],
        updatedAt: live.updatedAt,
        archived: live.archived ?? false,
      });
      continue;
    }
    const prevMsgs = existing.messages ?? [];
    const ids = new Set(prevMsgs.map((m) => m.id));
    const fresh = liveMsgs.filter((m) => !ids.has(m.id));
    const messages = fresh.length ? [...prevMsgs, ...fresh].sort((a, b) => a.at - b.at) : prevMsgs;
    if (!fresh.length && existing.updatedAt >= live.updatedAt) {
      if ((live.petName && live.petName !== existing.petName) || (live.petSpecies && live.petSpecies !== existing.petSpecies)) {
        map.set(live.id, {
          ...existing,
          petName: live.petName || existing.petName,
          petSpecies: live.petSpecies || existing.petSpecies,
        });
      }
      continue;
    }
    map.set(live.id, {
      ...existing,
      userName: nameFromUserMessages(messages, existing.userName || live.userName),
      petName: live.petName || existing.petName,
      petSpecies: live.petSpecies || existing.petSpecies,
      messages,
      updatedAt: Math.max(existing.updatedAt, live.updatedAt),
      archived: live.archived ?? existing.archived,
    });
  }
  return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

function mergeShop(base: Place, patch: ShopPatch, cover: string, avatar: string): Place {
  const shippingKind: ShippingKind =
    patch.shippingKind ?? base.shippingKind ?? (base.delivery ? 'same_day' : 'pickup');
  return {
    ...base,
    ...patch,
    city: patch.city ?? base.city ?? 'Rosario',
    shippingKind,
    delivery: shippingKind !== 'none' && shippingKind !== 'pickup',
    paymentMethods: patch.paymentMethods ?? base.paymentMethods,
    photoUri: cover || base.photoUri,
    avatarUri: avatar || base.avatarUri,
  };
}

type Store = {
  pin: string;
  authReady: boolean;
  setPin: (pin: string) => void;
  logout: () => void;
  shop: Place | undefined;
  updateShop: (patch: ShopPatch) => void;
  catalog: Product[];
  team: Professional[];
  turnos: Service[];
  threads: ShopThread[];
  inbox: ShopThread[];
  history: ShopThread[];
  unreadChatCount: number;
  unreadThreadIds: string[];
  markChatsSeen: () => void;
  unreadSalesCount: number;
  markSalesSeen: () => void;
  openThreadIds: string[];
  openThread: (id: string) => void;
  closeThread: (id: string) => void;
  sendThreadReply: (threadId: string, text: string) => void;
  deleteThread: (threadId: string) => void;
  chatAutoExpire: boolean;
  setChatAutoExpire: (on: boolean) => void;
  sales: OwnerSale[];
  liveSales: OwnerSale[];
  salesHistory: OwnerSale[];
  salesAutoExpire: boolean;
  setSalesAutoExpire: (on: boolean) => void;
  deleteSale: (orderId: string) => void;
  restoreSale: (orderId: string) => void;
  rateBuyer: (orderId: string, rating: { rating: number; text?: string }) => void;
  notices: ShopNotice[];
  dismissNotice: (id: string) => void;
  confirmOrder: (orderId: string) => void;
  supportChat: ShopMessage[];
  sendSupport: (text: string) => void;
  appointments: OwnerAppointment[];
  toggleTaken: (id: string) => void;
  stockAsks: StockAsk[];
  dismissAsk: (id: string) => void;
  offers: ShopDailyOffer[];
  todayOffers: ShopDailyOffer[];
  prices: Record<string, number>;
  paused: Record<string, boolean>;
  tab: Tab;
  setTab: (tab: Tab) => void;
  coverUri: string;
  avatarUri: string;
  setCover: (uri: string) => void;
  setAvatar: (uri: string) => void;
  setPrice: (serviceId: string, price: number) => void;
  togglePaused: (productId: string) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  drafts: Product[];
  addProduct: () => void;
  updateDraft: (id: string, patch: Partial<Product>) => void;
  publishDraft: (id: string) => { ok: true } | { ok: false; error: string };
  discardDraft: (id: string) => void;
  importSheet: (rows: SheetProductRow[]) => { added: number; updated: number; withPhoto: number; withoutPhoto: number };
  updateProfessional: (id: string, patch: Partial<Professional>) => void;
  addProfessional: () => void;
  removeProfessional: (id: string) => void;
  publishOffer: (productId: string, discountPct: number, label?: string) => void;
  unpublishOffer: (offerId: string) => void;
  markPaidOut: (orderId: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function OwnerProvider({ children }: { children: ReactNode }) {
  const [pin, setPinState] = useState(() => sessionStorage.getItem(PIN_KEY) ?? '');
  const [sessionShopId, setSessionShopId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const loginTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tab, setTab] = useState<Tab>('resumen');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const [sales, setSales] = useState<OwnerSale[]>([]);
  const [cover, setCoverState] = useState('');
  const [avatar, setAvatarState] = useState('');
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Product[]>([]);
  const [team, setTeam] = useState<Professional[]>([]);
  const [offers, setOffers] = useState<ShopDailyOffer[]>([]);
  const [shopPatch, setShopPatch] = useState<ShopPatch>({});
  const [threads, setThreads] = useState<ShopThread[]>([]);
  const [chatAutoExpire, setChatAutoExpireState] = useState(true);
  const [salesAutoExpire, setSalesAutoExpireState] = useState(true);
  const [openThreadIds, setOpenThreadIds] = useState<string[]>([]);
  const [notices, setNotices] = useState<ShopNotice[]>([]);
  const [seenAt, setSeenAt] = useState<Record<string, number>>({});
  const [supportChat, setSupportChat] = useState<ShopMessage[]>([]);
  const [appointments, setAppointments] = useState<OwnerAppointment[]>([]);
  const [stockAsks, setStockAsks] = useState<StockAsk[]>([]);
  const [salesSeenAt, setSalesSeenAt] = useState(0);
  const [ready, setReady] = useState(false);
  const hydrated = useRef<string | null>(null);
  const publishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salesRef = useRef<OwnerSale[]>([]);

  const base = sessionShopId ? places.find((p) => p.id === sessionShopId) : undefined;
  const shop = base ? mergeShop(base, shopPatch, cover, avatar) : undefined;

  useEffect(() => {
    (async () => {
      try {
        const existing = await ownerSession();
        if (existing.ok) {
          setSessionShopId(existing.shopId);
          return;
        }
        const saved = sessionStorage.getItem(PIN_KEY);
        if (saved && saved.length >= 4) {
          const login = await ownerLogin(saved);
          if (login.ok) {
            setSessionShopId(login.shopId);
            setPinState(saved);
          }
        }
      } catch {
        /* panel offline */
      } finally {
        setAuthReady(true);
      }
    })();
    return () => {
      if (loginTimer.current) clearTimeout(loginTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!base) {
      hydrated.current = null;
      setReady(false);
      setCatalog([]);
      setDrafts([]);
      setTeam([]);
      setOffers([]);
      setThreads([]);
      setSales([]);
      setShopPatch({});
      setOpenThreadIds([]);
      setSeenAt({});
      setSupportChat([]);
      setAppointments([]);
      setStockAsks([]);
      return;
    }
    const saved = loadShop(base.id);
    const auto = saved?.chatAutoExpire ?? true;
    const salesAuto = saved?.salesAutoExpire ?? true;
    setCatalog((saved?.catalog ?? []).filter((p) => !isSeedProductId(p.id)));
    setDrafts(saved?.drafts ?? []);
    setTeam(saved?.team ?? []);
    setOffers(saved?.offers ?? []);
    setPaused(saved?.paused ?? {});
    setPrices(saved?.prices ?? {});
    setCoverState(saved?.cover ?? base.photoUri);
    setAvatarState(saved?.avatar ?? base.avatarUri);
    setShopPatch(saved?.shopPatch ?? {});
    setChatAutoExpireState(auto);
    setSalesAutoExpireState(salesAuto);
    setThreads(pruneThreads((saved?.threads ?? []).filter((t) => !isDemoThreadId(t.id)), auto));
    setSales(pruneSales((saved?.sales ?? []).filter((s) => !isDemoLiveOrderId(s.id)).map(coerceSale), salesAuto));
    setSeenAt(saved?.seenAt ?? {});
    setSupportChat(saved?.supportChat ?? []);
    const booked = saved?.appointments;
    setAppointments(
      booked?.length && booked.every((a) => a.serviceKind && a.species)
        ? booked.map(coerceAppointment)
        : [],
    );
    setStockAsks(saved?.stockAsks ?? []);
    setSalesSeenAt(saved?.salesSeenAt ?? 0);
    setOpenThreadIds([]);
    hydrated.current = base.id;
    setReady(true);
  }, [base?.id]);

  useEffect(() => {
    if (!base || !ready || hydrated.current !== base.id) return;
    const payload: SavedShop = {
      catalog,
      drafts,
      team,
      offers,
      paused,
      prices,
      cover,
      avatar,
      shopPatch,
      threads,
      chatAutoExpire,
      salesAutoExpire,
      sales,
      seenAt,
      supportChat,
      appointments,
      stockAsks,
      salesSeenAt,
    };
    try {
      localStorage.setItem(SAVE_KEY(base.id), JSON.stringify(payload));
    } catch {
      /* quota */
    }
  }, [ready, base?.id, catalog, drafts, team, offers, paused, prices, cover, avatar, shopPatch, threads, chatAutoExpire, salesAutoExpire, sales, seenAt, supportChat, appointments, stockAsks, salesSeenAt]);

  useEffect(() => {
    salesRef.current = sales;
  }, [sales]);

  useEffect(() => {
    if (!base || !ready || hydrated.current !== base.id) return;
    if (!catalog.length || catalog.every((p) => isSeedProductId(p.id))) return;
    if (publishTimer.current) clearTimeout(publishTimer.current);
    publishTimer.current = setTimeout(() => {
      publishShopCatalog(base.id, catalog, paused);
    }, 700);
    return () => {
      if (publishTimer.current) clearTimeout(publishTimer.current);
    };
  }, [ready, base?.id, catalog, paused]);

  useEffect(() => {
    if (!base || !ready) return;
    let on = true;
    const pull = async () => {
      try {
        const file = await fetchLiveCatalog({ shopId: base.id });
        const live = file.shops[base.id];
        if (!live || !on) return;
        setStockAsks(live.asks ?? []);
        setCatalog((prev) => {
          const liveProducts = (live.products ?? []).filter((p) => !isSeedProductId(p.id));
          if (!prev.length && liveProducts.length) return liveProducts;
          let changed = false;
          const next = prev.map((p) => {
            const hit = liveProducts.find((x) => x.id === p.id);
            if (!hit || hit.stock === p.stock) return p;
            changed = true;
            return { ...p, stock: hit.stock };
          });
          return changed ? next : prev;
        });
        const incoming = (live.orders ?? []).filter(usableLiveOrder).filter((o) => !isDemoLiveOrderId(o.id));
        const known = new Set(salesRef.current.map((s) => s.id));
        const fresh = incoming.filter((o) => !known.has(o.id));
        if (fresh.length) {
          const mapped = fresh.map(liveOrderToOwnerSale);
          setSales((prev) => [...mapped, ...prev].sort((a, b) => b.paidAt - a.paidAt));
          setNotices((prev) => [
            ...mapped.map((s) => ({
              id: `nt-sale-${s.id}`,
              text: `🛒 Nuevo pedido de ${s.buyer} · ${formatARS(s.gross)}`,
              at: Date.now(),
            })),
            ...prev,
          ]);
        }
        const deliveryNotices: ShopNotice[] = [];
        for (const order of incoming) {
          const prev = salesRef.current.find((s) => s.id === order.id);
          if (!prev) continue;
          const from = knownDeliveryStatus(prev);
          const to = order.deliveryStatus ?? 'awaiting_shop';
          if (orderDeliveryRank(to) <= orderDeliveryRank(from)) continue;
          const who = order.buyer || prev.buyer || 'Tutor';
          if (
            to === 'received' ||
            (to === 'rated' && Number(order.receivedAt) > 0 && from !== 'received' && from !== 'rated')
          ) {
            deliveryNotices.push({
              id: `nt-recv-${order.id}`,
              text: `📦 El producto llegó bien · ${who}`,
              at: Date.now(),
            });
          }
          if (to === 'rated') {
            deliveryNotices.push({
              id: `nt-rate-${order.id}`,
              text: `⭐ Te han calificado · ${who}`,
              at: Date.now(),
            });
          }
        }
        if (deliveryNotices.length) {
          setNotices((prev) => {
            const ids = new Set(prev.map((n) => n.id));
            const add = deliveryNotices.filter((n) => !ids.has(n.id));
            return add.length ? [...add, ...prev] : prev;
          });
        }
        setSales((prev) => {
          if (!incoming.length) return prev;
          const liveById = new Map(incoming.map((o) => [o.id, liveOrderToOwnerSale(o)]));
          const next = prev.map((s) => {
            const hit = liveById.get(s.id);
            if (!hit) return s;
            const status =
              saleStatusRank(hit.status) >= saleStatusRank(s.status) ? hit.status : s.status;
            const deliveryStatus =
              orderDeliveryRank(hit.deliveryStatus) >= orderDeliveryRank(s.deliveryStatus)
                ? hit.deliveryStatus ?? s.deliveryStatus
                : s.deliveryStatus;
            if (
              s.status === status &&
              s.confirmedAt === (hit.confirmedAt ?? s.confirmedAt) &&
              s.payKind === hit.payKind &&
              s.cardLast4 === hit.cardLast4 &&
              s.deliveryStatus === deliveryStatus &&
              s.receivedAt === (hit.receivedAt ?? s.receivedAt) &&
              s.tutorRating?.at === (hit.tutorRating?.at ?? s.tutorRating?.at) &&
              s.buyerRating?.at === (hit.buyerRating?.at ?? s.buyerRating?.at)
            ) {
              return s;
            }
            return {
              ...s,
              status,
              confirmedAt: s.confirmedAt ?? hit.confirmedAt,
              receivedAt: s.receivedAt ?? hit.receivedAt,
              deliveryStatus,
              tutorRating: hit.tutorRating ?? s.tutorRating,
              buyerRating: hit.buyerRating ?? s.buyerRating,
              payKind: hit.payKind ?? s.payKind,
              cardBrand: hit.cardBrand ?? s.cardBrand,
              cardLast4: hit.cardLast4 ?? s.cardLast4,
            };
          });
          const changed = next.some((s, i) => s !== prev[i]);
          return changed ? next : prev;
        });
        const liveThreads = (live.threads ?? []).filter(
          (t) => t.shopId === base.id && !isDemoThreadId(t.id),
        );
        if (liveThreads.length) {
          setThreads((prev) => {
            const known = new Set(prev.map((t) => t.id));
            const freshThreads = liveThreads.filter((t) => !known.has(t.id));
            if (freshThreads.length) {
              setNotices((nPrev) => [
                ...freshThreads.map((t) => ({
                  id: `nt-chat-${t.id}-${t.updatedAt}`,
                  text: `💬 Nuevo chat de ${t.userName}`,
                  at: Date.now(),
                })),
                ...nPrev,
              ]);
            }
            const merged = mergeLiveThreads(prev, liveThreads);
            const changed =
              merged.length !== prev.length ||
              merged.some((t) => {
                const old = prev.find((p) => p.id === t.id);
                const oldLast = old?.messages?.[old.messages.length - 1]?.id;
                const nextLast = t.messages?.[t.messages.length - 1]?.id;
                return (
                  !old ||
                  (old.messages?.length ?? 0) !== (t.messages?.length ?? 0) ||
                  old.updatedAt !== t.updatedAt ||
                  oldLast !== nextLast ||
                  old.petName !== t.petName ||
                  old.petSpecies !== t.petSpecies
                );
              });
            return changed ? merged : prev;
          });
        }
      } catch (err) {
        console.warn('[owner-web] sync failed', err);
      }
    };
    pull();
    const t = setInterval(pull, 1500);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [ready, base?.id]);

  const setPin = (next: string) => {
    const value = next.replace(/\D/g, '').slice(0, 6);
    setPinState(value);
    if (loginTimer.current) clearTimeout(loginTimer.current);
    if (value.length < 4) {
      setSessionShopId(null);
      sessionStorage.removeItem(PIN_KEY);
      return;
    }
    loginTimer.current = setTimeout(() => {
      void (async () => {
        const result = await ownerLogin(value);
        if (result.ok) {
          setSessionShopId(result.shopId);
          sessionStorage.setItem(PIN_KEY, value);
        } else {
          setSessionShopId(null);
          sessionStorage.removeItem(PIN_KEY);
        }
      })();
    }, 320);
  };

  const logout = () => {
    void ownerLogout();
    setPinState('');
    setSessionShopId(null);
    sessionStorage.removeItem(PIN_KEY);
    setTab('resumen');
  };

  const setChatAutoExpire = (on: boolean) => {
    setChatAutoExpireState(on);
    if (on) setThreads((prev) => pruneThreads(prev, true));
  };

  const setSalesAutoExpire = (on: boolean) => {
    setSalesAutoExpireState(on);
    if (on) setSales((prev) => pruneSales(prev, true));
  };

  const todayOffers = liveOffers(offers);
  const turnos = shop ? services.filter((s) => s.placeId === shop.id) : [];
  const inbox = threads.filter((t) => !t.archived).sort((a, b) => b.updatedAt - a.updatedAt);
  const history = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
  const liveSales = sales.filter((s) => !s.archived).sort((a, b) => b.paidAt - a.paidAt);
  const salesHistory = [...sales].sort((a, b) => b.paidAt - a.paidAt);
  const unreadThreadIds = inbox.filter((t) => isUnreadThread(t, seenAt)).map((t) => t.id);
  const unreadChatCount = unreadThreadIds.length;
  const unreadSalesCount = sales.filter(
    (s) => !s.archived && s.status === 'awaiting_confirm' && s.paidAt > salesSeenAt,
  ).length;

  const markChatsSeen = () => {
    const now = Date.now();
    setSeenAt((prev) => {
      const next = { ...prev };
      for (const t of threads) {
        if (!t.archived) next[t.id] = now;
      }
      return next;
    });
  };

  const markSalesSeen = () => {
    setSalesSeenAt(Date.now());
  };

  const goTab = (next: Tab) => {
    if (next === 'ventas') markSalesSeen();
    setTab(next);
  };

  const value = useMemo<Store>(
    () => ({
      pin,
      authReady,
      setPin,
      logout,
      shop,
      updateShop: (patch) => {
        setShopPatch((prev) => ({ ...prev, ...patch }));
      },
      catalog,
      team,
      turnos,
      threads,
      inbox,
      history,
      unreadChatCount,
      unreadThreadIds,
      markChatsSeen,
      unreadSalesCount,
      markSalesSeen,
      openThreadIds,
      openThread: (id) => {
        setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, archived: false } : t)));
        setOpenThreadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        setSeenAt((prev) => ({ ...prev, [id]: Date.now() }));
      },
      closeThread: (id) => {
        setOpenThreadIds((prev) => prev.filter((x) => x !== id));
      },
      sendThreadReply: (threadId, text) => {
        if (!shop) return;
        const body = text.trim();
        if (body.length < 2) return;
        const msg: ShopMessage = {
          id: `ow-${Date.now()}`,
          shopId: shop.id,
          from: 'shop',
          author: shop.name,
          text: body,
          at: Date.now(),
        };
        void replyLiveChat(shop.id, threadId, msg);
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId
              ? { ...t, messages: [...(t.messages ?? []), msg], updatedAt: msg.at, archived: false }
              : t,
          ),
        );
      },
      deleteThread: (threadId) => {
        setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, archived: true } : t)));
        setOpenThreadIds((prev) => prev.filter((x) => x !== threadId));
      },
      chatAutoExpire,
      setChatAutoExpire,
      sales,
      liveSales,
      salesHistory,
      salesAutoExpire,
      setSalesAutoExpire,
      deleteSale: (orderId) => {
        setSales((prev) => prev.map((s) => (s.id === orderId ? { ...s, archived: true } : s)));
        if (base?.id) void archiveLiveOrder(base.id, orderId, true);
      },
      restoreSale: (orderId) => {
        setSales((prev) => prev.map((s) => (s.id === orderId ? { ...s, archived: false } : s)));
        if (base?.id) void archiveLiveOrder(base.id, orderId, false);
      },
      rateBuyer: (orderId, rating) => {
        const buyerRating = {
          rating: Math.min(5, Math.max(1, Math.round(rating.rating))),
          text: (rating.text ?? '').trim().slice(0, 400),
          at: Date.now(),
        };
        setSales((prev) => prev.map((s) => (s.id === orderId ? { ...s, buyerRating } : s)));
        if (base?.id) void rateLiveBuyer(base.id, orderId, rating);
      },
      notices,
      dismissNotice: (id) => setNotices((prev) => prev.filter((n) => n.id !== id)),
      confirmOrder: (orderId) => {
        setSales((prev) =>
          prev.map((s) =>
            s.id === orderId ? { ...s, status: 'confirmed' as const, confirmedAt: Date.now() } : s,
          ),
        );
        if (base?.id) void confirmLiveOrder(base.id, orderId);
        setNotices((prev) => [
          {
            id: `nt-${orderId}-${Date.now()}`,
            text: '✅ Pedido confirmado correctamente.',
            at: Date.now(),
          },
          ...prev,
        ]);
      },
      appointments,
      toggleTaken: (id) => {
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, taken: !a.taken } : a)));
      },
      stockAsks,
      dismissAsk: (id) => {
        if (shop) dismissShopAsk(shop.id, id);
        setStockAsks((prev) => prev.filter((a) => a.id !== id));
      },
      supportChat,
      sendSupport: (text) => {
        if (!shop) return;
        const body = text.trim();
        if (body.length < 2) return;
        const fromOwner: ShopMessage = {
          id: `sup-o-${Date.now()}`,
          shopId: shop.id,
          from: 'user',
          author: shop.name,
          text: body,
          at: Date.now(),
        };
        const fromAdmin: ShopMessage = {
          id: `sup-a-${Date.now()}`,
          shopId: shop.id,
          from: 'shop',
          author: 'GR Producciones',
          text: 'Recibido. El admin general te responde a la brevedad.',
          at: Date.now() + 1,
        };
        setSupportChat((prev) => [...prev, fromOwner, fromAdmin]);
      },
      offers,
      todayOffers,
      prices,
      paused,
      tab,
      setTab: goTab,
      coverUri: cover || shop?.photoUri || '',
      avatarUri: avatar || shop?.avatarUri || '',
      setCover: setCoverState,
      setAvatar: setAvatarState,
      setPrice: (serviceId, price) => {
        setPrices((prev) => ({ ...prev, [serviceId]: price }));
      },
      togglePaused: (productId) => {
        setPaused((prev) => ({ ...prev, [productId]: !prev[productId] }));
      },
      updateProduct: (id, patch) => {
        setCatalog((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      },
      drafts,
      addProduct: () => {
        if (!shop) return;
        setDrafts((prev) => [
          {
            id: `draft-${Date.now()}`,
            shopId: shop.id,
            name: '',
            category: 'General',
            price: 0,
            stock: 0,
            unit: 'u',
            image: PRODUCT_PLACEHOLDER,
            description: '',
            sold: 0,
            species: 'all',
          },
          ...prev,
        ]);
      },
      updateDraft: (id, patch) => {
        setDrafts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      },
      publishDraft: (id) => {
        if (!shop) return { ok: false, error: 'Local no disponible.' };
        const draft = drafts.find((p) => p.id === id);
        if (!draft) return { ok: false, error: 'No encontramos ese borrador.' };
        const err = validateProductForPublish(draft);
        if (err) return { ok: false, error: err };
        const published: Product = {
          ...draft,
          id: `prod-${Date.now()}`,
          shopId: shop.id,
          name: draft.name.trim(),
          category: draft.category.trim(),
          description: draft.description.trim(),
        };
        setCatalog((prev) => [published, ...prev]);
        setDrafts((prev) => prev.filter((p) => p.id !== id));
        return { ok: true };
      },
      discardDraft: (id) => {
        setDrafts((prev) => prev.filter((p) => p.id !== id));
      },
      importSheet: (rows) => {
        if (!shop) return { added: 0, updated: 0, withPhoto: 0, withoutPhoto: 0 };
        const next = mergeSheetProducts(catalog, rows, shop.id, PRODUCT_PLACEHOLDER);
        setCatalog(next.catalog);
        return {
          added: next.added,
          updated: next.updated,
          withPhoto: next.withPhoto,
          withoutPhoto: next.withoutPhoto,
        };
      },
      updateProfessional: (id, patch) => {
        setTeam((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      },
      addProfessional: () => {
        if (!shop) return;
        setTeam((prev) => [
          ...prev,
          {
            id: `pro-${Date.now()}`,
            placeId: shop.id,
            name: 'Nuevo profesional',
            role: 'Equipo del local',
            rating: 5,
            photo: '',
            license: '',
            years: 1,
            bio: '',
            quote: '',
            reviewer: '',
            reviews: 0,
            rank: prev.length + 1,
          },
        ]);
      },
      removeProfessional: (id) => {
        setTeam((prev) => prev.filter((p) => p.id !== id));
      },
      publishOffer: (productId, discountPct, label) => {
        if (!shop || discountPct <= 0) return;
        const until = endOfDay(Date.now());
        setOffers((prev) => {
          const rest = prev.filter((o) => o.productId !== productId);
          return [
            ...rest,
            {
              id: `off-${productId}-${until}`,
              shopId: shop.id,
              productId,
              discountPct,
              label: label?.trim() || undefined,
              until,
            },
          ];
        });
        setCatalog((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, discountPct, featured: true } : p)),
        );
      },
      unpublishOffer: (offerId) => {
        const current = offers.find((o) => o.id === offerId);
        setOffers((prev) => prev.filter((o) => o.id !== offerId));
        if (current) {
          setCatalog((prev) =>
            prev.map((p) => (p.id === current.productId ? { ...p, discountPct: undefined } : p)),
          );
        }
      },
      markPaidOut: (orderId) => {
        setSales((prev) =>
          prev.map((s) => (s.id === orderId ? { ...s, status: 'paid_out' as const } : s)),
        );
      },
    }),
    [
      pin,
      authReady,
      shop,
      catalog,
      drafts,
      team,
      turnos,
      threads,
      inbox,
      history,
      openThreadIds,
      unreadChatCount,
      unreadThreadIds,
      unreadSalesCount,
      salesSeenAt,
      chatAutoExpire,
      salesAutoExpire,
      sales,
      liveSales,
      salesHistory,
      notices,
      supportChat,
      appointments,
      stockAsks,
      offers,
      todayOffers,
      prices,
      paused,
      tab,
      cover,
      avatar,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOwner() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOwner');
  return ctx;
}

export const PAYMENT_OPTIONS: PaymentMethod[] = ['mercadopago', 'transfer', 'wallet', 'cash', 'debit'];
export const SHIPPING_OPTIONS: ShippingKind[] = ['pickup', 'same_day', 'home', 'pickup_and_home', 'none'];
export { CHAT_KEEP_MS };
