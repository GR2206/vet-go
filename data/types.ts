export type Species = 'dog' | 'cat';
export type PlaceKind = 'petshop' | 'vet' | 'grooming' | 'vet24';
export type OrderStatus = 'preparing' | 'on_the_way' | 'delivered';
export type BookingStatus = 'confirmed' | 'pending' | 'done' | 'cancelled';

export type Pet = {
  id: string;
  name: string;
  species: Species;
  ageYears: number;
  breed: string;
  photoUri?: string;
  sex: 'macho' | 'hembra';
  weightKg: number;
  chip?: string;
  lastVisit?: string;
  lastBath?: string;
  lastVaccine?: string;
  nextVaccine?: string;
  vetName?: string;
  heightCm?: number;
  healthy?: boolean;
};

export type PaymentMethod = 'mercadopago' | 'transfer' | 'wallet' | 'cash' | 'debit';

export type ShippingKind = 'none' | 'pickup' | 'same_day' | 'home' | 'pickup_and_home';

export type CheckoutMethod =
  | 'mercadopago'
  | 'card'
  | 'transfer'
  | 'personalpay'
  | 'uala'
  | 'modo';

export type PlaceReview = {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
};

export type Place = {
  id: string;
  name: string;
  kind: PlaceKind;
  neighborhood: string;
  address: string;
  rating: number;
  reviews: number;
  distanceKm: number;
  open: boolean;
  hours: string;
  delivery: boolean;
  hasPlans: boolean;
  phone: string;
  coordinate: { latitude: number; longitude: number };
  blurb: string;
  ownerPin: string;
  photoUri: string;
  avatarUri: string;
  responseMins: number;
  reviewList: PlaceReview[];
  paymentMethods: PaymentMethod[];
  city?: string;
  shippingKind?: ShippingKind;
};

export type ShopMessage = {
  id: string;
  shopId: string;
  from: 'user' | 'shop';
  author: string;
  text: string;
  at: number;
};

export type ShopThread = {
  id: string;
  shopId: string;
  userName: string;
  buyerUid?: string;
  petName?: string;
  petSpecies?: 'dog' | 'cat';
  messages: ShopMessage[];
  updatedAt: number;
  archived: boolean;
};

export type ShippingAddress = {
  firstName: string;
  lastName: string;
  fullName: string;
  dni: string;
  phone: string;
  email: string;
  street: string;
  number: string;
  floor: string;
  neighborhood: string;
  city: string;
  postalCode: string;
  notes: string;
};

export type UserProfile = {
  name: string;
  email: string;
  zone: string;
  vip: boolean;
  points: number;
  phone?: string;
  shipping?: ShippingAddress;
};

export type Product = {
  id: string;
  shopId: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  featured?: boolean;
  discountPct?: number;
  species?: Species | 'all';
  image: string;
  description: string;
  sold: number;
  freeShipping?: boolean;
};

/** Oferta del día que publica el dueño; Inicio del tutor la toma mientras `until` no venció. */
export type ShopDailyOffer = {
  id: string;
  shopId: string;
  productId: string;
  discountPct: number;
  label?: string;
  until: number;
};

export type Plan = {
  id: string;
  placeId: string;
  name: string;
  price: number;
  perks: string[];
  baths: number;
  consults: number;
  image: string;
  social: string;
};

export type Professional = {
  id: string;
  placeId: string;
  name: string;
  role: string;
  rating: number;
  photo: string;
  license: string;
  years: number;
  bio: string;
  quote: string;
  reviewer: string;
  reviews: number;
  rank: number;
  featured?: boolean;
};

export type Service = {
  id: string;
  placeId: string;
  name: string;
  minutes: number;
  price: number;
  category: 'clinic' | 'grooming';
};

export type CartItem = {
  productId: string;
  shopId: string;
  qty: number;
};

export type ShopOrderItem = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
};

export type OrderRating = {
  rating: number;
  text: string;
  at: number;
};

export type OrderDeliveryStatus = 'awaiting_shop' | 'confirmed' | 'received' | 'rated' | 'cancelled';

export type ShopOrder = {
  id: string;
  shopId: string;
  shopName?: string;
  items: ShopOrderItem[];
  gross: number;
  fee: number;
  net: number;
  method: CheckoutMethod;
  payKind?: 'credit' | 'debit';
  cardBrand?: 'visa' | 'mastercard' | 'amex' | 'unknown';
  cardLast4?: string;
  status: 'paid' | 'payout_pending' | 'paid_out';
  deliveryStatus: OrderDeliveryStatus;
  confirmedAt?: number;
  receivedAt?: number;
  ratedAt?: number;
  tutorRating?: OrderRating;
  buyerRating?: OrderRating;
  confirmNotified?: boolean;
  pendingOpen?: boolean;
  pendingDismissed?: boolean;
  shipping: ShippingAddress;
  createdAt: number;
  paidAt: number;
};

export type Booking = {
  id: string;
  placeId: string;
  serviceId: string;
  professionalId: string;
  dateLabel: string;
  time: string;
  at?: number;
  status: BookingStatus;
  usedVoucher?: boolean;
};

export type Voucher = {
  id: string;
  planId: string;
  label: string;
  left: number;
};

export type CollarBrand = 'apple' | 'xiaomi' | 'samsung' | 'tile' | 'other';

export type CollarTracker = {
  petId: string;
  brand: CollarBrand;
  label: string;
  associatedAt: number;
  latitude: number;
  longitude: number;
  accuracyM: number;
};

export type WalkerReview = {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
};

export type WalkerHours = {
  start: string;
  end: string;
  step: 30 | 60;
};

export type DogWalker = {
  id: string;
  name: string;
  photo: string;
  cover: string;
  neighborhood: string;
  rating: number;
  reviews: number;
  years: number;
  joinedAt: string;
  ownerPin: string;
  priceWalk: number;
  bio: string;
  description: string;
  specialties: string[];
  rank: number;
  featured?: boolean;
  hours: WalkerHours;
  coordinate: { latitude: number; longitude: number };
  distanceKm: number;
  reviewList: WalkerReview[];
};

export type WalkerProfilePatch = {
  name?: string;
  photo?: string;
  cover?: string;
  neighborhood?: string;
  bio?: string;
  description?: string;
  priceWalk?: number;
  specialties?: string[];
  hours?: WalkerHours;
};

export type WalkerJoin = {
  name: string;
  neighborhood: string;
  phone: string;
  email: string;
  bio: string;
  submittedAt: number;
};

export type WalkBooking = {
  id: string;
  walkerId: string;
  petId: string;
  dateLabel: string;
  time: string;
  at: number;
  status: 'pending' | 'confirmed';
};
