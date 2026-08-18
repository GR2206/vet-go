import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { defaultShopChats, plans, products } from '@/data/mock';
import { companionPet, createPet } from '@/data/pets';
import { DAY_MS, esDateLabel } from '@/lib/dates';
import {
  createResetRequest,
  hashPassword,
  isResetExpired,
  isValidEmail,
  normalizeEmail,
  resetStorageKey,
  validatePassword,
  validatePasswordMatch,
  type ResetRequest,
} from '@/lib/auth';
import { deviceOrigin, type Origin } from '@/lib/here';
import { chatTutorKey } from '@/lib/chat-tutor-key';
import { cartillaPet, threadPetFromCartilla } from '@/lib/active-pet';
import type { Booking, CartItem, CollarTracker, OrderDeliveryStatus, Pet, PlaceReview, ShippingAddress, ShopMessage, ShopOrder, UserProfile, Voucher, WalkBooking, WalkerJoin, WalkerProfilePatch, WalkerReview } from '@/data/types';
import {
  cancelLiveOrder,
  chatThreadId,
  pushChatMessage,
  rateLiveOrder,
  receiveLiveOrder,
  type LiveShopOrder,
} from '@/lib/live-catalog';
import { isFirebaseConfigured } from '@/lib/cloud-catalog';

const STORAGE_KEY = 'vetgo.session.v2';
const LEGACY_KEY = 'vetgo.session.v1';
const ACCOUNTS_KEY = 'vetgo.accounts.v1';
const ACTIVE_KEY = 'vetgo.active.email';

type Session = {
  onboarded: boolean;
  loggedIn: boolean;
  user: UserProfile | null;
  pets: Pet[];
  activePetId: string | null;
  cart: CartItem[];
  bookings: Booking[];
  vouchers: Voucher[];
  trackers: Record<string, CollarTracker>;
  placePhotos: Record<string, string>;
  placeAvatars: Record<string, string>;
  placeReviews: Record<string, PlaceReview[]>;
  shopChats: Record<string, ShopMessage[]>;
  staffPhotos: Record<string, string>;
  servicePrices: Record<string, number>;
  heroBackdrop: 'landscapes' | 'linear';
  walkerReviews: Record<string, WalkerReview[]>;
  walkerProfiles: Record<string, WalkerProfilePatch>;
  walkBookings: WalkBooking[];
  shopOrders: ShopOrder[];
  walkerJoin: WalkerJoin | null;
  favoritePlaceIds: string[];
  favoriteProductIds: string[];
  favoriteStaffIds: string[];
};

type AccountFile = Record<string, { passwordHash: string; session: Session }>;

const empty: Session = {
  onboarded: false,
  loggedIn: false,
  user: null,
  pets: [],
  activePetId: null,
  cart: [],
  bookings: [],
  vouchers: [],
  trackers: {},
  placePhotos: {},
  placeAvatars: {},
  placeReviews: {},
  shopChats: defaultShopChats,
  staffPhotos: {},
  servicePrices: {},
  heroBackdrop: 'landscapes',
  walkerReviews: {},
  walkerProfiles: {},
  walkBookings: [],
  shopOrders: [],
  walkerJoin: null,
  favoritePlaceIds: [],
  favoriteProductIds: [],
  favoriteStaffIds: [],
};

type Store = Session & {
  ready: boolean;
  pet: Pet | null;
  origin: Origin | null;
  ensureOrigin: () => Promise<Origin>;
  completeOnboarding: (user: Partial<UserProfile>, draft: Pick<Pet, 'name' | 'species'>) => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: true; onboarded: boolean } | { ok: false; error: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) => Promise<{ ok: true; onboarded: boolean } | { ok: false; error: string }>;
  requestPasswordReset: (
    email: string,
  ) => Promise<
    | { ok: true; email: string; demoCode: string }
    | { ok: false; error: string }
  >;
  resetPassword: (
    email: string,
    code: string,
    password: string,
    confirmPassword: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  toggleFavoritePlace: (placeId: string) => void;
  toggleFavoriteProduct: (productId: string) => void;
  toggleFavoriteStaff: (staffId: string) => void;
  setActivePet: (id: string) => void;
  updatePetPhoto: (id: string, uri: string) => void;
  updatePet: (id: string, patch: Partial<Pet>) => void;
  addPet: (draft: Pick<Pet, 'name' | 'species'>) => void;
  addToCart: (productId: string, shopId: string, qty?: number) => void;
  changeQty: (productId: string, delta: number) => void;
  clearShopCart: (shopId: string) => void;
  addBooking: (booking: Booking) => void;
  subscribePlan: (planId: string) => void;
  setVip: (value: boolean) => void;
  spendPoints: (amount: number) => void;
  associateTracker: (tracker: CollarTracker) => void;
  removeTracker: (petId: string) => void;
  updateTrackerPing: (
    petId: string,
    ping: Pick<CollarTracker, 'latitude' | 'longitude' | 'accuracyM'>,
  ) => void;
  updatePlacePhoto: (placeId: string, uri: string) => void;
  updatePlaceAvatar: (placeId: string, uri: string) => void;
  updateServicePrice: (serviceId: string, price: number) => void;
  addPlaceReview: (placeId: string, review: Omit<PlaceReview, 'id' | 'date'>) => void;
  updatePlaceReview: (placeId: string, reviewId: string, patch: Pick<PlaceReview, 'rating' | 'text'> & { author?: string }) => void;
  sendShopMessage: (shopId: string, message: Pick<ShopMessage, 'from' | 'author' | 'text'>) => void;
  mergeShopChatFromLive: (shopId: string, messages: ShopMessage[]) => void;
  updateStaffPhoto: (professionalId: string, uri: string) => void;
  setHeroBackdrop: (kind: 'landscapes' | 'linear') => void;
  saveShipping: (shipping: ShippingAddress) => void;
  updateUser: (patch: Partial<UserProfile>) => void;
  submitWalkerJoin: (join: Omit<WalkerJoin, 'submittedAt'>) => void;
  addWalkerReview: (walkerId: string, review: Omit<WalkerReview, 'id' | 'date'>) => void;
  updateWalkerReview: (walkerId: string, reviewId: string, patch: Pick<WalkerReview, 'rating' | 'text'> & { author?: string }) => void;
  updateWalkerProfile: (walkerId: string, patch: WalkerProfilePatch) => void;
  addWalkBooking: (booking: WalkBooking) => void;
  addShopOrder: (order: ShopOrder) => void;
  removeShopOrder: (orderId: string) => void;
  clearShopOrders: () => void;
  markShopOrderPaidOut: (orderId: string) => void;
  syncShopOrderFromLive: (orderId: string, live: LiveShopOrder) => void;
  markOrderConfirmNotified: (orderId: string) => void;
  markOrderReceived: (orderId: string) => void;
  markOrderRated: (orderId: string) => void;
  dismissPendingOrder: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
};

const Ctx = createContext<Store | null>(null);

function migrate(raw: string): Session {
  try {
    const s = migrateUnsafe(raw);
    return {
      ...s,
      loggedIn: Boolean(s.loggedIn),
      favoritePlaceIds: s.favoritePlaceIds ?? [],
      favoriteProductIds: s.favoriteProductIds ?? [],
      favoriteStaffIds: s.favoriteStaffIds ?? [],
    };
  } catch {
    return empty;
  }
}

function hydrateOrders(orders: ShopOrder[] | undefined): ShopOrder[] {
  return (orders ?? []).map((o) => ({
    ...o,
    method: o.method ?? 'mercadopago',
    payKind: o.payKind,
    cardBrand: o.cardBrand,
    cardLast4: o.cardLast4,
    deliveryStatus: o.deliveryStatus ?? 'awaiting_shop',
    confirmNotified: o.confirmNotified ?? false,
    pendingOpen: o.pendingOpen ?? false,
    pendingDismissed: o.pendingDismissed ?? false,
    ratedAt: o.ratedAt,
  }));
}

function orderStatusRank(status?: string) {
  if (status === 'cancelled') return 4;
  if (status === 'rated') return 3;
  if (status === 'received') return 2;
  if (status === 'confirmed') return 1;
  return 0;
}

function liveDeliveryStatus(raw?: string): OrderDeliveryStatus {
  if (raw === 'confirmed' || raw === 'received' || raw === 'rated' || raw === 'cancelled') return raw;
  return 'awaiting_shop';
}

function migrateUnsafe(raw: string): Session {
  const parsed = JSON.parse(raw) as Session & { pet?: Pet | null };
  if (Array.isArray(parsed.pets) && parsed.pets.length) {
    return {
      ...empty,
      ...parsed,
      pets: parsed.pets.map((p, i) => {
        const withBath = p.lastBath
          ? p
          : { ...p, lastBath: esDateLabel(Date.now() - (i === 0 ? 5 : 9) * DAY_MS) };
        if (withBath.lastVaccine) return withBath;
        const due = withBath.nextVaccine;
        return {
          ...withBath,
          lastVaccine: i === 0 ? '27 ago 2025' : '2 sep 2025',
          nextVaccine: due ?? (i === 0 ? '27 ago 2026' : '2 sep 2026'),
        };
      }),
      trackers: parsed.trackers ?? {},
      placePhotos: parsed.placePhotos ?? {},
      placeAvatars: parsed.placeAvatars ?? {},
      placeReviews: parsed.placeReviews ?? {},
      shopChats: parsed.shopChats ?? defaultShopChats,
      staffPhotos: parsed.staffPhotos ?? {},
      servicePrices: parsed.servicePrices ?? {},
      heroBackdrop: parsed.heroBackdrop === 'linear' ? 'linear' : 'landscapes',
      walkerReviews: parsed.walkerReviews ?? {},
      walkerProfiles: parsed.walkerProfiles ?? {},
      walkBookings: parsed.walkBookings ?? [],
      shopOrders: hydrateOrders(parsed.shopOrders),
      walkerJoin: parsed.walkerJoin ?? null,
    };
  }
  if (parsed.pet) {
    const main = createPet(parsed.pet);
    const extra = companionPet(main);
    return {
      ...empty,
      ...parsed,
      pets: [main, extra],
      activePetId: main.id,
      trackers: parsed.trackers ?? {},
      placePhotos: parsed.placePhotos ?? {},
      placeAvatars: parsed.placeAvatars ?? {},
      placeReviews: parsed.placeReviews ?? {},
      shopChats: parsed.shopChats ?? defaultShopChats,
      staffPhotos: parsed.staffPhotos ?? {},
      servicePrices: parsed.servicePrices ?? {},
      heroBackdrop: parsed.heroBackdrop === 'linear' ? 'linear' : 'landscapes',
      walkerReviews: parsed.walkerReviews ?? {},
      walkerProfiles: parsed.walkerProfiles ?? {},
      walkBookings: parsed.walkBookings ?? [],
      shopOrders: hydrateOrders(parsed.shopOrders),
      walkerJoin: parsed.walkerJoin ?? null,
    };
  }
  return {
    ...empty,
    ...parsed,
    pets: parsed.pets ?? [],
    trackers: parsed.trackers ?? {},
    placePhotos: parsed.placePhotos ?? {},
    placeAvatars: parsed.placeAvatars ?? {},
    placeReviews: parsed.placeReviews ?? {},
    shopChats: parsed.shopChats ?? defaultShopChats,
    staffPhotos: parsed.staffPhotos ?? {},
    servicePrices: parsed.servicePrices ?? {},
    heroBackdrop: parsed.heroBackdrop === 'linear' ? 'linear' : 'landscapes',
    walkerReviews: parsed.walkerReviews ?? {},
    walkerProfiles: parsed.walkerProfiles ?? {},
    walkBookings: parsed.walkBookings ?? [],
    shopOrders: hydrateOrders(parsed.shopOrders),
    walkerJoin: parsed.walkerJoin ?? null,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session>(empty);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const accountsRef = useRef<AccountFile>({});
  const hashRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [accountsRaw, active, current, legacy] = await Promise.all([
          AsyncStorage.getItem(ACCOUNTS_KEY),
          AsyncStorage.getItem(ACTIVE_KEY),
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(LEGACY_KEY),
        ]);
        if (accountsRaw) {
          try {
            accountsRef.current = JSON.parse(accountsRaw) as AccountFile;
          } catch {
            accountsRef.current = {};
          }
        }
        const email = active ? normalizeEmail(active) : '';
        const account = email ? accountsRef.current[email] : undefined;
        if (account?.session) {
          hashRef.current = account.passwordHash;
          setSession({ ...migrate(JSON.stringify(account.session)), loggedIn: true });
        } else if (current) {
          setSession({ ...migrate(current), loggedIn: false });
        } else if (legacy) {
          setSession({ ...migrate(legacy), loggedIn: false });
        }
      } catch {
        setSession(empty);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session)).catch(() => undefined);
    const email = session.user?.email ? normalizeEmail(session.user.email) : '';
    if (session.loggedIn && email && hashRef.current) {
      accountsRef.current[email] = { passwordHash: hashRef.current, session };
      AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accountsRef.current)).catch(() => undefined);
      AsyncStorage.setItem(ACTIVE_KEY, email).catch(() => undefined);
    }
  }, [ready, session]);

  const pet = cartillaPet(session.pets, session.activePetId);

  const ensureOrigin = useCallback(async () => {
    const next = await deviceOrigin();
    setOrigin(next);
    return next;
  }, []);

  const api = useMemo<Store>(
    () => ({
      ...session,
      pet,
      ready,
      origin,
      ensureOrigin,
      completeOnboarding: async (user, draft) => {
        const main = createPet(draft);
        const extra = companionPet(main);
        setSession((s) => ({
          ...s,
          onboarded: true,
          loggedIn: true,
          user: {
            name: user.name?.trim() || s.user?.name || 'Tutor',
            email: user.email?.trim() || s.user?.email || '',
            zone: user.zone || s.user?.zone || 'Centro',
            vip: s.user?.vip ?? false,
            points: s.user?.points ?? 500,
            phone: user.phone ?? s.user?.phone,
            shipping: s.user?.shipping,
          },
          pets: s.pets.length ? s.pets : [main, extra],
          activePetId: s.activePetId ?? main.id,
        }));
      },
      login: async (email, password) => {
        const key = normalizeEmail(email);
        if (!key || !password) return { ok: false, error: 'Completá email y contraseña.' };
        const rec = accountsRef.current[key];
        if (!rec) return { ok: false, error: 'No hay una cuenta con ese email.' };
        if (rec.passwordHash !== hashPassword(key, password)) {
          return { ok: false, error: 'Contraseña incorrecta.' };
        }
        hashRef.current = rec.passwordHash;
        const next = { ...migrate(JSON.stringify(rec.session)), loggedIn: true };
        setSession(next);
        await AsyncStorage.setItem(ACTIVE_KEY, key);
        return { ok: true, onboarded: next.onboarded };
      },
      register: async (name, email, password, confirmPassword) => {
        const key = normalizeEmail(email);
        if (!name.trim()) return { ok: false, error: 'Poné tu nombre.' };
        if (!isValidEmail(key)) return { ok: false, error: 'Email inválido.' };
        const passCheck = validatePassword(password);
        if (!passCheck.ok) return passCheck;
        const matchCheck = validatePasswordMatch(password, confirmPassword);
        if (!matchCheck.ok) return matchCheck;
        if (accountsRef.current[key]) return { ok: false, error: 'Ese email ya tiene cuenta. Entrá.' };
        const passwordHash = hashPassword(key, password);
        hashRef.current = passwordHash;
        let onboarded = false;
        setSession((s) => {
          onboarded = s.onboarded;
          return {
            ...s,
            loggedIn: true,
            user: {
              name: name.trim(),
              email: key,
              zone: s.user?.zone ?? 'Centro',
              vip: s.user?.vip ?? false,
              points: s.user?.points ?? 500,
              phone: s.user?.phone,
              shipping: s.user?.shipping,
            },
          };
        });
        await AsyncStorage.setItem(ACTIVE_KEY, key);
        return { ok: true, onboarded };
      },
      requestPasswordReset: async (email) => {
        const key = normalizeEmail(email);
        if (!isValidEmail(key)) return { ok: false, error: 'Ingresá un email válido.' };
        if (!accountsRef.current[key]) {
          return { ok: false, error: 'No hay una cuenta con ese email.' };
        }
        const req = createResetRequest(key);
        await AsyncStorage.setItem(resetStorageKey(), JSON.stringify(req));
        return { ok: true, email: key, demoCode: req.code };
      },
      resetPassword: async (email, code, password, confirmPassword) => {
        const key = normalizeEmail(email);
        const cleanCode = code.replace(/\D/g, '');
        if (!isValidEmail(key)) return { ok: false, error: 'Email inválido.' };
        if (cleanCode.length !== 6) return { ok: false, error: 'El código tiene 6 dígitos.' };
        const passCheck = validatePassword(password);
        if (!passCheck.ok) return passCheck;
        const matchCheck = validatePasswordMatch(password, confirmPassword);
        if (!matchCheck.ok) return matchCheck;
        const rec = accountsRef.current[key];
        if (!rec) return { ok: false, error: 'No hay una cuenta con ese email.' };
        let pending: ResetRequest | null = null;
        try {
          const raw = await AsyncStorage.getItem(resetStorageKey());
          if (raw) pending = JSON.parse(raw) as ResetRequest;
        } catch {
          pending = null;
        }
        if (!pending || normalizeEmail(pending.email) !== key) {
          return { ok: false, error: 'Pedí un código nuevo desde “Olvidé mi contraseña”.' };
        }
        if (isResetExpired(pending)) {
          await AsyncStorage.removeItem(resetStorageKey());
          return { ok: false, error: 'El código venció. Pedí uno nuevo.' };
        }
        if (pending.code !== cleanCode) {
          return { ok: false, error: 'Código incorrecto. Revisá el email o reenviá.' };
        }
        const passwordHash = hashPassword(key, password);
        hashRef.current = passwordHash;
        accountsRef.current[key] = { passwordHash, session: rec.session };
        await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accountsRef.current));
        await AsyncStorage.removeItem(resetStorageKey());
        return { ok: true };
      },
      logout: async () => {
        hashRef.current = null;
        await AsyncStorage.removeItem(ACTIVE_KEY);
        setSession(empty);
      },
      toggleFavoritePlace: (placeId) => {
        setSession((s) => ({
          ...s,
          favoritePlaceIds: s.favoritePlaceIds.includes(placeId)
            ? s.favoritePlaceIds.filter((id) => id !== placeId)
            : [...s.favoritePlaceIds, placeId],
        }));
      },
      toggleFavoriteProduct: (productId) => {
        setSession((s) => ({
          ...s,
          favoriteProductIds: s.favoriteProductIds.includes(productId)
            ? s.favoriteProductIds.filter((id) => id !== productId)
            : [...s.favoriteProductIds, productId],
        }));
      },
      toggleFavoriteStaff: (staffId) => {
        setSession((s) => ({
          ...s,
          favoriteStaffIds: s.favoriteStaffIds.includes(staffId)
            ? s.favoriteStaffIds.filter((id) => id !== staffId)
            : [...s.favoriteStaffIds, staffId],
        }));
      },
      setActivePet: (id) => setSession((s) => ({ ...s, activePetId: id })),
      updatePetPhoto: (id, uri) => {
        setSession((s) => ({
          ...s,
          pets: s.pets.map((p) => (p.id === id ? { ...p, photoUri: uri } : p)),
        }));
      },
      updatePet: (id, patch) => {
        setSession((s) => ({
          ...s,
          pets: s.pets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
      },
      addPet: (draft) => {
        const next = createPet(draft);
        setSession((s) => ({ ...s, pets: [...s.pets, next], activePetId: next.id }));
      },
      addToCart: (productId, shopId, qty = 1) => {
        const add = Math.max(1, qty);
        setSession((s) => {
          const existing = s.cart.find((i) => i.productId === productId);
          const product = products.find((p) => p.id === productId);
          const nextCart = existing
            ? s.cart.map((i) => (i.productId === productId ? { ...i, qty: i.qty + add } : i))
            : [...s.cart, { productId, shopId, qty: add }];
          const points = Math.round((product?.price ?? 0) * 0.01 * add);
          return {
            ...s,
            cart: nextCart,
            user: s.user
              ? { ...s.user, points: s.user.points + (s.user.vip ? points * 2 : points) }
              : s.user,
          };
        });
      },
      changeQty: (productId, delta) => {
        setSession((s) => ({
          ...s,
          cart: s.cart
            .map((i) => (i.productId === productId ? { ...i, qty: i.qty + delta } : i))
            .filter((i) => i.qty > 0),
        }));
      },
      clearShopCart: (shopId) => {
        setSession((s) => ({ ...s, cart: s.cart.filter((i) => i.shopId !== shopId) }));
      },
      addBooking: (booking) => {
        setSession((s) => ({ ...s, bookings: [booking, ...s.bookings] }));
      },
      subscribePlan: (planId) => {
        const plan = plans.find((p) => p.id === planId);
        if (!plan) return;
        setSession((s) => ({
          ...s,
          vouchers: [
            ...s.vouchers.filter((v) => v.planId !== planId),
            { id: `v-${planId}`, planId, label: plan.name, left: plan.baths + plan.consults || 1 },
          ],
        }));
      },
      setVip: (value) => {
        setSession((s) => ({
          ...s,
          user: s.user ? { ...s.user, vip: value } : s.user,
        }));
      },
      spendPoints: (amount) => {
        setSession((s) => ({
          ...s,
          user: s.user ? { ...s.user, points: Math.max(0, s.user.points - amount) } : s.user,
        }));
      },
      associateTracker: (tracker) => {
        setSession((s) => ({
          ...s,
          trackers: { ...s.trackers, [tracker.petId]: tracker },
        }));
      },
      removeTracker: (petId) => {
        setSession((s) => {
          const next = { ...s.trackers };
          delete next[petId];
          return { ...s, trackers: next };
        });
      },
      updateTrackerPing: (petId, ping) => {
        setSession((s) => {
          const current = s.trackers[petId];
          if (!current) return s;
          return {
            ...s,
            trackers: { ...s.trackers, [petId]: { ...current, ...ping } },
          };
        });
      },
      updatePlacePhoto: (placeId, uri) => {
        setSession((s) => ({
          ...s,
          placePhotos: { ...s.placePhotos, [placeId]: uri },
        }));
      },
      updatePlaceAvatar: (placeId, uri) => {
        setSession((s) => ({
          ...s,
          placeAvatars: { ...s.placeAvatars, [placeId]: uri },
        }));
      },
      updateServicePrice: (serviceId, price) => {
        setSession((s) => ({
          ...s,
          servicePrices: { ...s.servicePrices, [serviceId]: price },
        }));
      },
      addPlaceReview: (placeId, review) => {
        const next: PlaceReview = {
          id: `pr-${Date.now()}`,
          date: new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }),
          ...review,
        };
        setSession((s) => ({
          ...s,
          placeReviews: {
            ...s.placeReviews,
            [placeId]: [next, ...(s.placeReviews[placeId] ?? [])],
          },
        }));
      },
      updatePlaceReview: (placeId, reviewId, patch) => {
        setSession((s) => {
          const list = s.placeReviews[placeId] ?? [];
          const found = list.some((r) => r.id === reviewId);
          const next = found
            ? list.map((r) => (r.id === reviewId ? { ...r, ...patch } : r))
            : [
                {
                  id: reviewId,
                  author: patch.author ?? 'Vos',
                  date: new Date().toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }),
                  rating: patch.rating,
                  text: patch.text,
                },
                ...list,
              ];
          return { ...s, placeReviews: { ...s.placeReviews, [placeId]: next } };
        });
      },
      sendShopMessage: (shopId, message) => {
        setSession((s) => {
          const next: ShopMessage = {
            id: `sm-${Date.now()}`,
            shopId,
            at: Date.now(),
            ...message,
          };
          const tutorKey = chatTutorKey(s.user, message.author);
          const threadId = chatThreadId(shopId, tutorKey);
          const petMeta = threadPetFromCartilla(cartillaPet(s.pets, s.activePetId));
          void pushChatMessage({
            shopId,
            threadId,
            userName: s.user?.name ?? message.author,
            ...(petMeta ?? {}),
            message: next,
          }).then((result) => {
            if (result.ok) return;
            const hint =
              result.reason === 'missing_key' || result.reason === 'no_backend'
                ? 'Completá Firebase en .env (EXPO_PUBLIC_FIREBASE_*) para chatear desde cualquier red.'
                : `No pudimos enviar el mensaje (${result.reason}).`;
            Alert.alert('Chat no enviado', hint);
          });
          return {
            ...s,
            shopChats: {
              ...s.shopChats,
              [shopId]: [...(s.shopChats[shopId] ?? []), next],
            },
          };
        });
      },
      mergeShopChatFromLive: (shopId, messages) => {
        setSession((s) => {
          const existing = s.shopChats[shopId] ?? [];
          const ids = new Set(existing.map((m) => m.id));
          const fresh = messages.filter((m) => !ids.has(m.id));
          if (!fresh.length) return s;
          const merged = [...existing, ...fresh].sort((a, b) => a.at - b.at);
          return { ...s, shopChats: { ...s.shopChats, [shopId]: merged } };
        });
      },
      updateStaffPhoto: (professionalId, uri) => {
        setSession((s) => ({
          ...s,
          staffPhotos: { ...s.staffPhotos, [professionalId]: uri },
        }));
      },
      setHeroBackdrop: (kind) => {
        setSession((s) => ({ ...s, heroBackdrop: kind }));
      },
      saveShipping: (shipping) => {
        setSession((s) => ({
          ...s,
          user: s.user
            ? { ...s.user, shipping, phone: shipping.phone, email: shipping.email || s.user.email }
            : s.user,
        }));
      },
      updateUser: (patch) => {
        setSession((s) => ({
          ...s,
          user: s.user ? { ...s.user, ...patch } : s.user,
        }));
      },
      submitWalkerJoin: (join) => {
        setSession((s) => ({
          ...s,
          walkerJoin: { ...join, submittedAt: Date.now() },
        }));
      },
      addWalkerReview: (walkerId, review) => {
        const next: WalkerReview = {
          id: `wr-${Date.now()}`,
          date: new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }),
          ...review,
        };
        setSession((s) => ({
          ...s,
          walkerReviews: {
            ...s.walkerReviews,
            [walkerId]: [next, ...(s.walkerReviews[walkerId] ?? [])],
          },
        }));
      },
      updateWalkerReview: (walkerId, reviewId, patch) => {
        setSession((s) => {
          const list = s.walkerReviews[walkerId] ?? [];
          const found = list.some((r) => r.id === reviewId);
          const next = found
            ? list.map((r) => (r.id === reviewId ? { ...r, ...patch } : r))
            : [
                {
                  id: reviewId,
                  author: patch.author ?? 'Vos',
                  date: new Date().toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }),
                  rating: patch.rating,
                  text: patch.text,
                },
                ...list,
              ];
          return { ...s, walkerReviews: { ...s.walkerReviews, [walkerId]: next } };
        });
      },
      updateWalkerProfile: (walkerId, patch) => {
        setSession((s) => ({
          ...s,
          walkerProfiles: {
            ...s.walkerProfiles,
            [walkerId]: { ...(s.walkerProfiles[walkerId] ?? {}), ...patch },
          },
        }));
      },
      addWalkBooking: (booking) => {
        setSession((s) => ({ ...s, walkBookings: [booking, ...s.walkBookings] }));
      },
      addShopOrder: (order) => {
        setSession((s) => ({ ...s, shopOrders: [order, ...s.shopOrders] }));
      },
      removeShopOrder: (orderId) => {
        setSession((s) => ({ ...s, shopOrders: s.shopOrders.filter((o) => o.id !== orderId) }));
      },
      clearShopOrders: () => {
        setSession((s) => ({ ...s, shopOrders: [] }));
      },
      markShopOrderPaidOut: (orderId) => {
        setSession((s) => ({
          ...s,
          shopOrders: s.shopOrders.map((o) =>
            o.id === orderId ? { ...o, status: 'paid_out' as const } : o,
          ),
        }));
      },
      syncShopOrderFromLive: (orderId, live) => {
        setSession((s) => ({
          ...s,
          shopOrders: s.shopOrders.map((o) => {
            if (o.id !== orderId) return o;
            const liveStatus = liveDeliveryStatus(live.deliveryStatus);
            const status =
              orderStatusRank(liveStatus) > orderStatusRank(o.deliveryStatus)
                ? liveStatus
                : o.deliveryStatus;
            return {
              ...o,
              shopName: live.shopName ?? o.shopName,
              deliveryStatus: status,
              confirmedAt: live.confirmedAt ?? o.confirmedAt,
              receivedAt: live.receivedAt ?? o.receivedAt,
              payKind:
                live.payKind === 'credit' || live.payKind === 'debit'
                  ? live.payKind
                  : o.payKind,
              cardBrand:
                live.cardBrand === 'visa' ||
                live.cardBrand === 'mastercard' ||
                live.cardBrand === 'amex' ||
                live.cardBrand === 'unknown'
                  ? live.cardBrand
                  : o.cardBrand,
              cardLast4: live.cardLast4 ?? o.cardLast4,
            };
          }),
        }));
      },
      markOrderConfirmNotified: (orderId) => {
        setSession((s) => ({
          ...s,
          shopOrders: s.shopOrders.map((o) =>
            o.id === orderId ? { ...o, confirmNotified: true } : o,
          ),
        }));
      },
      markOrderReceived: (orderId) => {
        setSession((s) => {
          const order = s.shopOrders.find((o) => o.id === orderId);
          if (!order) return s;
          if (order.deliveryStatus !== 'rated') void receiveLiveOrder(order.shopId, orderId);
          return {
            ...s,
            shopOrders: s.shopOrders.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    deliveryStatus:
                      orderStatusRank(o.deliveryStatus) >= orderStatusRank('received')
                        ? o.deliveryStatus
                        : ('received' as const),
                    receivedAt: o.receivedAt ?? Date.now(),
                    pendingOpen: true,
                    pendingDismissed: false,
                  }
                : o,
            ),
          };
        });
      },
      markOrderRated: (orderId) => {
        setSession((s) => {
          const order = s.shopOrders.find((o) => o.id === orderId);
          if (!order) return s;
          void rateLiveOrder(order.shopId, orderId);
          return {
            ...s,
            shopOrders: s.shopOrders.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    deliveryStatus: 'rated' as const,
                    ratedAt: o.ratedAt ?? Date.now(),
                    pendingOpen: true,
                    pendingDismissed: false,
                  }
                : o,
            ),
          };
        });
      },
      dismissPendingOrder: (orderId) => {
        setSession((s) => ({
          ...s,
          shopOrders: s.shopOrders.map((o) =>
            o.id === orderId ? { ...o, pendingOpen: false, pendingDismissed: true } : o,
          ),
        }));
      },
      cancelOrder: (orderId) => {
        setSession((s) => {
          const order = s.shopOrders.find((o) => o.id === orderId);
          if (!order || order.deliveryStatus !== 'awaiting_shop') return s;
          if (Date.now() - order.paidAt > 2 * 60 * 1000) return s;
          void cancelLiveOrder(order.shopId, orderId);
          return {
            ...s,
            shopOrders: s.shopOrders.map((o) =>
              o.id === orderId ? { ...o, deliveryStatus: 'cancelled' as const } : o,
            ),
          };
        });
      },
    }),
    [ready, session, pet, origin, ensureOrigin],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
