import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { defaultShopChats, places, products, professionals, services } from '@petsgo/data/mock';
import type {
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
import { publishShopCatalog, fetchLiveCatalog, dismissShopAsk, type StockAsk } from '@petsgo/lib/live-catalog';
import { splitSale } from '@petsgo/lib/payout';
import { mergeSheetProducts, type SheetProductRow } from '@petsgo/lib/sheet-catalog';

import { PRODUCT_PLACEHOLDER } from './files';

const PIN_KEY = 'petsgo.owner.pin';
const SAVE_KEY = (shopId: string) => `petsgo.owner.v1.${shopId}`;
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
  paidAt: number;
  createdAt: number;
  status: OwnerSaleStatus;
  shipping: ShippingAddress;
  confirmedAt?: number;
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
};

function ship(
  fullName: string,
  extra: Partial<ShippingAddress> & Pick<ShippingAddress, 'street' | 'number' | 'neighborhood' | 'phone'>,
): ShippingAddress {
  const [firstName, ...rest] = fullName.split(' ');
  return {
    firstName: firstName || fullName,
    lastName: rest.join(' ') || '',
    fullName,
    dni: extra.dni ?? '35111222',
    phone: extra.phone,
    email: extra.email ?? `${firstName?.toLowerCase() ?? 'tutor'}@mail.com`,
    street: extra.street,
    number: extra.number,
    floor: extra.floor ?? '',
    neighborhood: extra.neighborhood,
    city: extra.city ?? 'Rosario',
    postalCode: extra.postalCode ?? '2000',
    notes: extra.notes ?? '',
  };
}

function demoSales(shopId: string): OwnerSale[] {
  if (shopId !== 'pichichos') return [];
  const a = splitSale(48900);
  const b = splitSale(17800);
  const c = splitSale(12400);
  const d = splitSale(9600);
  const e = splitSale(22100);
  return [
    {
      id: 'ow-new',
      shopId,
      buyer: 'Julián R.',
      items: [{ name: 'Correa antideslizante 1,20 m', qty: 1, unitPrice: 12400 }],
      ...c,
      method: 'mercadopago',
      createdAt: Date.now() - 36e5 * 2,
      paidAt: Date.now() - 36e5 * 2,
      status: 'awaiting_confirm',
      shipping: ship('Julián R.', {
        street: 'Italia',
        number: '890',
        floor: '1 A',
        neighborhood: 'Pichincha',
        phone: '3415554411',
        email: 'julian@mail.com',
        notes: 'Timbre Rivas. Perro en el patio.',
      }),
    },
    {
      id: 'ow-1',
      shopId,
      buyer: 'Gino Rossi',
      items: [{ name: 'Royal Canin Maxi Adult 15 kg', qty: 1, unitPrice: 48900 }],
      ...a,
      method: 'mercadopago',
      createdAt: Date.now() - 36e5 * 5,
      paidAt: Date.now() - 36e5 * 5,
      status: 'confirmed',
      confirmedAt: Date.now() - 36e5 * 4,
      shipping: ship('Gino Rossi', {
        street: 'San Lorenzo',
        number: '1240',
        floor: '3 B',
        neighborhood: 'Centro',
        phone: '3415550000',
        dni: '35111222',
        notes: 'Portería, dejar con el encargado.',
      }),
    },
    {
      id: 'ow-2',
      shopId,
      buyer: 'Carla M.',
      items: [{ name: 'Pipeta antipulgas M 10-20 kg', qty: 2, unitPrice: 8900 }],
      ...b,
      method: 'transfer',
      createdAt: Date.now() - DAY_MS * 2,
      paidAt: Date.now() - DAY_MS * 2,
      status: 'paid_out',
      confirmedAt: Date.now() - DAY_MS * 2 + 36e5,
      shipping: ship('Carla M.', {
        street: 'Córdoba',
        number: '2100',
        neighborhood: 'Echesortu',
        phone: '3415557788',
        notes: 'Retira en el local.',
      }),
    },
    {
      id: 'ow-3',
      shopId,
      buyer: 'Ana P.',
      items: [{ name: 'Snacks dentales x30', qty: 1, unitPrice: 9600 }],
      ...d,
      method: 'mercadopago',
      createdAt: Date.now() - DAY_MS * 9,
      paidAt: Date.now() - DAY_MS * 9,
      status: 'confirmed',
      confirmedAt: Date.now() - DAY_MS * 9 + 36e5,
      shipping: ship('Ana P.', {
        street: 'Mendoza',
        number: '1540',
        neighborhood: 'Centro',
        phone: '3415554411',
      }),
    },
    {
      id: 'ow-4',
      shopId,
      buyer: 'Lucía S.',
      items: [{ name: 'Cama ortopédica M', qty: 1, unitPrice: 22100 }],
      ...e,
      method: 'transfer',
      createdAt: Date.now() - DAY_MS * 4,
      paidAt: Date.now() - DAY_MS * 4,
      status: 'confirmed',
      confirmedAt: Date.now() - DAY_MS * 4 + 36e5,
      archived: true,
      shipping: ship('Lucía S.', {
        street: 'Ovidio Lagos',
        number: '732',
        neighborhood: 'Pichincha',
        phone: '3415553300',
      }),
    },
  ];
}

function demoThreads(shopId: string): ShopThread[] {
  const seeded = defaultShopChats[shopId] ?? [];
  const fromFlat = seeded.length
    ? [
        {
          id: `th-${shopId}-gino`,
          shopId,
          userName: 'Gino',
          messages: [
            ...seeded,
            {
              id: `sc-${shopId}-new`,
              shopId,
              from: 'user' as const,
              author: 'Gino',
              text: 'Dale, confirmo retiro a las 17.',
              at: Date.now() - 1000 * 60 * 18,
            },
          ],
          updatedAt: Date.now() - 1000 * 60 * 18,
          archived: false,
        },
      ]
    : [];
  if (shopId === 'pichichos') {
    return [
      ...fromFlat,
      {
        id: 'th-carla',
        shopId,
        userName: 'Carla M.',
        messages: [
          {
            id: 'sc-c1',
            shopId,
            from: 'user',
            author: 'Carla M.',
            text: '¿La pipeta de 10-20 kg es para pelo largo también?',
            at: Date.now() - 1000 * 60 * 40,
          },
        ],
        updatedAt: Date.now() - 1000 * 60 * 40,
        archived: false,
      },
      {
        id: 'th-julian',
        shopId,
        userName: 'Julián R.',
        messages: [
          {
            id: 'sc-j1',
            shopId,
            from: 'user',
            author: 'Julián R.',
            text: 'Pedí la correa. ¿Me confirman el envío a Pichincha?',
            at: Date.now() - 36e5 * 12,
          },
          {
            id: 'sc-j2',
            shopId,
            from: 'shop',
            author: 'Pichichos',
            text: 'Sí, sale hoy por cadete. Te aviso cuando esté en camino.',
            at: Date.now() - 36e5 * 11,
          },
        ],
        updatedAt: Date.now() - 36e5 * 11,
        archived: true,
      },
      {
        id: 'th-ana',
        shopId,
        userName: 'Ana P.',
        messages: [
          {
            id: 'sc-a1',
            shopId,
            from: 'user',
            author: 'Ana P.',
            text: 'Quedó anotado el Royal Canin de la semana pasada. ¿Tienen más stock?',
            at: Date.now() - DAY_MS * 22,
          },
        ],
        updatedAt: Date.now() - DAY_MS * 22,
        archived: true,
      },
    ];
  }
  if (fromFlat.length) return fromFlat;
  return [
    {
      id: `th-${shopId}-demo`,
      shopId,
      userName: 'Tutor demo',
      messages: [
        {
          id: `sc-${shopId}-1`,
          shopId,
          from: 'user',
          author: 'Tutor demo',
          text: 'Hola, quería consultar un turno para esta semana.',
          at: Date.now() - 1000 * 60 * 90,
        },
      ],
      updatedAt: Date.now() - 1000 * 60 * 90,
      archived: false,
    },
  ];
}

function cloneCatalog(shopId: string): Product[] {
  return products.filter((p) => p.shopId === shopId).map((p) => ({ ...p }));
}

function cloneTeam(shopId: string): Professional[] {
  return professionals.filter((p) => p.placeId === shopId).map((p) => ({ ...p }));
}

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

function demoAppointments(shopId: string): OwnerAppointment[] {
  const tutors: { pet: string; species: 'dog' | 'cat'; tutor: string; phone: string; email: string }[] = [
    { pet: 'Max', species: 'dog', tutor: 'Gino Rossi', phone: '3415550000', email: 'gino@mail.com' },
    { pet: 'Mora', species: 'cat', tutor: 'Carla M.', phone: '3415557788', email: 'carla@mail.com' },
    { pet: 'Coco', species: 'dog', tutor: 'Ana P.', phone: '3415554411', email: 'ana@mail.com' },
    { pet: 'Lola', species: 'cat', tutor: 'Julián R.', phone: '3415551200', email: 'julian@mail.com' },
    { pet: 'Toby', species: 'dog', tutor: 'Lucía S.', phone: '3415553300', email: 'lucia@mail.com' },
  ];
  const services: AppointmentService[] = ['vet', 'vaccine', 'bath', 'cut'];
  const times = ['09:00', '10:30', '12:00', '14:30', '16:00', '17:30'];
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = now.getDate();
  const last = new Date(y, m + 1, 0).getDate();
  const days = [2, 5, 8, 10, 12, 15, today, today, today + 1, today + 3, 22, 25, 28].filter(
    (d) => d >= 1 && d <= last,
  );
  return days.map((day, i) => {
    const who = tutors[i % tutors.length];
    const time = times[i % times.length];
    const [hh, mm] = time.split(':').map(Number);
    const serviceKind = services[i % services.length];
    const grooming = serviceKind === 'bath' || serviceKind === 'cut';
    return {
      id: `ap-${shopId}-${i}`,
      shopId,
      at: new Date(y, m, day, hh, mm).getTime(),
      time,
      petName: who.pet,
      species: who.species,
      kind: grooming ? 'grooming' : 'clinic',
      serviceKind,
      serviceName: SERVICE_NAME[serviceKind],
      tutorName: who.tutor,
      tutorPhone: who.phone,
      tutorEmail: who.email,
      taken: i === 1,
    };
  });
}

function demoSupport(shopId: string, shopName: string): ShopMessage[] {
  return [
    {
      id: 'sup-1',
      shopId,
      from: 'shop',
      author: 'GR Producciones',
      text: `Hola ${shopName}, somos el admin de PETS&GO (GR Producciones). Escribí acá y te respondemos.`,
      at: Date.now() - 1000 * 60 * 5,
    },
  ];
}

function isUnreadThread(thread: ShopThread, seenAt: Record<string, number>) {
  if (thread.archived) return false;
  const last = thread.messages[thread.messages.length - 1];
  if (!last || last.from !== 'user') return false;
  return last.at > (seenAt[thread.id] ?? 0);
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

function coerceSale(raw: OwnerSale): OwnerSale {
  return { ...raw, archived: raw.archived ?? false };
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
  addProduct: () => void;
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
  const [tab, setTab] = useState<Tab>('resumen');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const [sales, setSales] = useState<OwnerSale[]>([]);
  const [cover, setCoverState] = useState('');
  const [avatar, setAvatarState] = useState('');
  const [catalog, setCatalog] = useState<Product[]>([]);
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
  const [ready, setReady] = useState(false);
  const hydrated = useRef<string | null>(null);
  const publishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const base = places.find((p) => p.ownerPin === pin);
  const shop = base ? mergeShop(base, shopPatch, cover, avatar) : undefined;

  useEffect(() => {
    if (!base) {
      hydrated.current = null;
      setReady(false);
      setCatalog([]);
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
    setCatalog(saved?.catalog ?? cloneCatalog(base.id));
    setTeam(saved?.team ?? cloneTeam(base.id));
    setOffers(saved?.offers ?? []);
    setPaused(saved?.paused ?? {});
    setPrices(saved?.prices ?? {});
    setCoverState(saved?.cover ?? base.photoUri);
    setAvatarState(saved?.avatar ?? base.avatarUri);
    setShopPatch(saved?.shopPatch ?? {});
    setChatAutoExpireState(auto);
    setSalesAutoExpireState(salesAuto);
    setThreads(pruneThreads(saved?.threads ?? demoThreads(base.id), auto));
    setSales(pruneSales((saved?.sales ?? demoSales(base.id)).map(coerceSale), salesAuto));
    setSeenAt(saved?.seenAt ?? {});
    setSupportChat(saved?.supportChat ?? demoSupport(base.id, base.name));
    const booked = saved?.appointments;
    setAppointments(
      booked?.length && booked.every((a) => a.serviceKind && a.species)
        ? booked.map(coerceAppointment)
        : demoAppointments(base.id),
    );
    setStockAsks(saved?.stockAsks ?? []);
    setOpenThreadIds([]);
    hydrated.current = base.id;
    setReady(true);
  }, [base?.id]);

  useEffect(() => {
    if (!base || !ready || hydrated.current !== base.id) return;
    const payload: SavedShop = {
      catalog,
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
    };
    try {
      localStorage.setItem(SAVE_KEY(base.id), JSON.stringify(payload));
    } catch {
      /* quota */
    }
  }, [ready, base?.id, catalog, team, offers, paused, prices, cover, avatar, shopPatch, threads, chatAutoExpire, salesAutoExpire, sales, seenAt, supportChat, appointments, stockAsks]);

  useEffect(() => {
    if (!base || !ready || hydrated.current !== base.id) return;
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
        const file = await fetchLiveCatalog();
        const live = file.shops[base.id];
        if (!live || !on) return;
        setStockAsks(live.asks ?? []);
        setCatalog((prev) => {
          let changed = false;
          const next = prev.map((p) => {
            const hit = live.products.find((x) => x.id === p.id);
            if (!hit || hit.stock === p.stock) return p;
            changed = true;
            return { ...p, stock: hit.stock };
          });
          return changed ? next : prev;
        });
      } catch {
        /* owner-web apagado */
      }
    };
    pull();
    const t = setInterval(pull, 6000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [ready, base?.id]);

  const setPin = (next: string) => {
    const value = next.replace(/\D/g, '').slice(0, 6);
    setPinState(value);
    if (places.some((p) => p.ownerPin === value)) sessionStorage.setItem(PIN_KEY, value);
  };

  const logout = () => {
    setPinState('');
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

  const goTab = (next: Tab) => {
    if (next === 'chat') markChatsSeen();
    setTab(next);
  };

  const value = useMemo<Store>(
    () => ({
      pin,
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
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId
              ? { ...t, messages: [...t.messages, msg], updatedAt: msg.at, archived: false }
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
      },
      restoreSale: (orderId) => {
        setSales((prev) => prev.map((s) => (s.id === orderId ? { ...s, archived: false } : s)));
      },
      notices,
      dismissNotice: (id) => setNotices((prev) => prev.filter((n) => n.id !== id)),
      confirmOrder: (orderId) => {
        setSales((prev) =>
          prev.map((s) =>
            s.id === orderId ? { ...s, status: 'confirmed' as const, confirmedAt: Date.now() } : s,
          ),
        );
        setNotices((prev) => [
          {
            id: `nt-${orderId}-${Date.now()}`,
            text: 'Pedido confirmado correctamente.',
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
      addProduct: () => {
        if (!shop) return;
        setCatalog((prev) => [
          {
            id: `prod-${Date.now()}`,
            shopId: shop.id,
            name: 'Nuevo producto',
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
      shop,
      catalog,
      team,
      turnos,
      threads,
      inbox,
      history,
      openThreadIds,
      unreadChatCount,
      unreadThreadIds,
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
