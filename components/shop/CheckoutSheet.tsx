import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import type { CheckoutMethod, Place, ShippingAddress } from '@/data/types';
import {
  brandLabel,
  detectCardBrand,
  digitsOnly,
  formatCardNumber,
  formatExpiry,
  type PayKind,
  validateCard,
} from '@/lib/card';
import { formatARS } from '@/lib/format';
import { CHECKOUT_METHODS, PLATFORM_TRANSFER } from '@/lib/pay';
import { splitSale } from '@/lib/payout';
import { isShipCity, localStreets, searchStreetsRemote, SHIP_CITIES, type StreetHit } from '@/lib/street-search';
import { openMercadoPago, openWalletApp } from '@/lib/wallets';
import { colors, fonts, radius, surface } from '@/theme/tokens';

const empty: ShippingAddress = {
  firstName: '',
  lastName: '',
  fullName: '',
  dni: '',
  phone: '',
  email: '',
  street: '',
  number: '',
  floor: '',
  neighborhood: '',
  city: 'Rosario',
  postalCode: '',
  notes: '',
};

function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

const emptyCard = {
  holder: '',
  number: '',
  expiry: '',
  cvv: '',
};

export function CheckoutSheet({
  open,
  shop,
  total,
  initial,
  defaults,
  onClose,
  onConfirm,
}: {
  open: boolean;
  shop: Place | undefined;
  total: number;
  initial?: ShippingAddress;
  defaults?: { name?: string; email?: string; phone?: string; zone?: string };
  onClose: () => void;
  onConfirm: (
    shipping: ShippingAddress,
    split: { gross: number; fee: number; net: number },
    pay: {
      method: CheckoutMethod;
      payKind?: PayKind;
      cardBrand?: ReturnType<typeof detectCardBrand>;
      cardLast4?: string;
    },
  ) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<ShippingAddress>(empty);
  const [channel, setChannel] = useState<CheckoutMethod | null>(null);
  const [payKind, setPayKind] = useState<PayKind>('credit');
  const [card, setCard] = useState(emptyCard);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [hits, setHits] = useState<StreetHit[]>([]);
  const [openCity, setOpenCity] = useState(false);
  const skipStreetSearch = useRef(false);
  const brand = detectCardBrand(card.number);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setError('');
    setPaying(false);
    setChannel(null);
    setPayKind('credit');
    setCard(emptyCard);
    setHits([]);
    setOpenCity(false);
    setForm({
      ...empty,
      ...initial,
      firstName: initial?.firstName || splitName(initial?.fullName || defaults?.name || '').firstName,
      lastName: initial?.lastName || splitName(initial?.fullName || defaults?.name || '').lastName,
      fullName: initial?.fullName || defaults?.name || '',
      email: initial?.email || defaults?.email || '',
      phone: initial?.phone || defaults?.phone || '',
      neighborhood: initial?.neighborhood || defaults?.zone || '',
      city: initial?.city || 'Rosario',
    });
    // Snapshot al abrir; no rehidratar mientras se escribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = form.street.trim();
    if (skipStreetSearch.current) {
      skipStreetSearch.current = false;
      setHits([]);
      return;
    }
    if (!q) {
      setHits([]);
      return;
    }
    setHits(localStreets(q, form.city));
    let cancelled = false;
    const t = setTimeout(() => {
      searchStreetsRemote(q, form.city)
        .then((list) => {
          if (cancelled) return;
          setHits((prev) => {
            const keyOf = (h: StreetHit) => `${h.street}|${h.city}`.toLowerCase();
            const uniq = new Map(prev.map((h) => [keyOf(h), h]));
            for (const h of list) {
              const k = keyOf(h);
              const cur = uniq.get(k);
              if (!cur || (h.number && !cur.number)) uniq.set(k, h);
            }
            return [...uniq.values()].slice(0, 8);
          });
        })
        .catch(() => undefined);
    }, 90);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [form.street, form.city, open]);

  const set = (key: keyof ShippingAddress, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'firstName' || key === 'lastName') {
        next.fullName = `${next.firstName} ${next.lastName}`.trim();
      }
      return next;
    });
  };

  const goPay = () => {
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.street.trim() ||
      !form.number.trim() ||
      !form.phone.trim()
    ) {
      setError('Completá nombre, apellido, domicilio, número y teléfono.');
      return;
    }
    setError('');
    setStep(2);
  };

  const pickStreet = (hit: StreetHit) => {
    skipStreetSearch.current = true;
    setHits([]);
    setForm((prev) => ({
      ...prev,
      street: hit.street,
      number: hit.number || prev.number,
      neighborhood: hit.neighborhood || prev.neighborhood,
      postalCode: hit.postcode || prev.postalCode,
      city: isShipCity(hit.city) ? hit.city : prev.city,
    }));
  };

  const pickMethod = async (id: CheckoutMethod) => {
    setChannel(id);
    setError('');
    if (id === 'mercadopago') await openMercadoPago();
    if (id === 'personalpay' || id === 'uala' || id === 'modo') await openWalletApp(id);
  };

  const confirmPay = async () => {
    if (paying || !shop) return;
    if (!channel) {
      setError('Elegí una forma de pago.');
      return;
    }
    if (channel === 'card') {
      const cardError = validateCard(card);
      if (cardError) {
        setError(cardError);
        return;
      }
    }
    setPaying(true);
    setError('');
    await new Promise((r) => setTimeout(r, 400));
    setPaying(false);
    const number = digitsOnly(card.number);
    onConfirm(form, splitSale(total), {
      method: channel,
      payKind: channel === 'card' ? payKind : undefined,
      cardBrand: channel === 'card' ? detectCardBrand(number) : undefined,
      cardLast4: channel === 'card' ? number.slice(-4) : undefined,
    });
  };

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.head}>
          {step === 2 ? (
            <BackLink
              onPress={() => {
                if (channel) {
                  setChannel(null);
                  setError('');
                  return;
                }
                setStep(1);
              }}
            />
          ) : (
            <Pressable onPress={onClose}>
              <Text style={styles.back}>Cancelar</Text>
            </Pressable>
          )}
          <Text style={styles.kicker}>{shop?.name}</Text>
          <Text style={styles.title}>{step === 1 ? 'Envío' : 'Pago'}</Text>
        </View>

        {step === 1 ? (
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Nombre"
                  required
                  value={form.firstName}
                  onChange={(v) => set('firstName', v)}
                  autoCap="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Apellido"
                  required
                  value={form.lastName}
                  onChange={(v) => set('lastName', v)}
                  autoCap="words"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1.65 }}>
                <Field
                  label="Domicilio"
                  required
                  value={form.street}
                  onChange={(v) => set('street', v)}
                  autoCap="words"
                  placeholder="Calle"
                />
                {hits.length ? (
                  <View style={styles.suggest}>
                    {hits.map((hit) => (
                      <Pressable key={hit.id} onPress={() => pickStreet(hit)} style={styles.suggestRow}>
                        <Text style={styles.suggestTitle} numberOfLines={1}>
                          {hit.street}
                          {hit.number ? ` ${hit.number}` : ''}
                        </Text>
                        <Text style={styles.suggestMeta} numberOfLines={1}>
                          {[hit.neighborhood, hit.city].filter(Boolean).join(' · ')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 0.7 }}>
                <Field
                  label="Número"
                  required
                  value={form.number}
                  onChange={(v) => set('number', v)}
                  keyboard="number-pad"
                  placeholder="Altura"
                />
              </View>
            </View>
            <Field
              label="Teléfono"
              required
              value={form.phone}
              onChange={(v) => set('phone', v)}
              keyboard="phone-pad"
            />
            <Field label="DNI" value={form.dni} onChange={(v) => set('dni', v)} keyboard="number-pad" />
            <Field label="Email" value={form.email} onChange={(v) => set('email', v)} keyboard="email-address" />
            <Field label="Piso / depto" value={form.floor} onChange={(v) => set('floor', v)} />
            <Field label="Barrio" value={form.neighborhood} onChange={(v) => set('neighborhood', v)} />
            <View style={styles.row}>
              <View style={{ flex: 1.2 }}>
                <Text style={styles.label}>Ciudad</Text>
                <Pressable
                  onPress={() => setOpenCity((v) => !v)}
                  style={[styles.input, form.city.trim() ? styles.inputFilled : null, styles.cityBtn]}
                >
                  <Text style={styles.cityValue}>{form.city || 'Elegí ciudad'}</Text>
                  <Text style={styles.cityChevron}>{openCity ? '▴' : '▾'}</Text>
                </Pressable>
                {openCity ? (
                  <View style={styles.suggest}>
                    {SHIP_CITIES.map((city) => (
                      <Pressable
                        key={city}
                        onPress={() => {
                          set('city', city);
                          setOpenCity(false);
                        }}
                        style={styles.suggestRow}
                      >
                        <Text style={[styles.suggestTitle, city === form.city && styles.suggestOn]}>{city}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 0.8 }}>
                <Field label="CP" value={form.postalCode} onChange={(v) => set('postalCode', v)} keyboard="number-pad" />
              </View>
            </View>
            <Field label="Indicaciones" value={form.notes} onChange={(v) => set('notes', v)} multiline />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Continuar" onPress={goPay} />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.total}>{formatARS(total)}</Text>
            {CHECKOUT_METHODS.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => pickMethod(m.id)}
                style={[styles.method, channel === m.id && styles.methodOn]}
              >
                <FontAwesome
                  name={m.icon}
                  size={16}
                  color={channel === m.id ? colors.white : colors.navy}
                />
                <Text style={[styles.methodTxt, channel === m.id && styles.methodTxtOn]}>{m.label}</Text>
              </Pressable>
            ))}

            {channel === 'card' ? (
              <>
                <View style={styles.kinds}>
                  <Pressable
                    onPress={() => setPayKind('credit')}
                    style={[styles.kind, payKind === 'credit' && styles.kindOn]}
                  >
                    <Text style={[styles.kindTxt, payKind === 'credit' && styles.kindTxtOn]}>Crédito</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPayKind('debit')}
                    style={[styles.kind, payKind === 'debit' && styles.kindOn]}
                  >
                    <Text style={[styles.kindTxt, payKind === 'debit' && styles.kindTxtOn]}>Débito</Text>
                  </Pressable>
                </View>
                <Field
                  label="Titular"
                  value={card.holder}
                  onChange={(v) => setCard((c) => ({ ...c, holder: v }))}
                  autoCap="words"
                />
                <Field
                  label={brand === 'unknown' ? 'Número de tarjeta' : brandLabel(brand)}
                  value={card.number}
                  onChange={(v) => setCard((c) => ({ ...c, number: formatCardNumber(v) }))}
                  keyboard="number-pad"
                />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Vencimiento"
                      value={card.expiry}
                      onChange={(v) => setCard((c) => ({ ...c, expiry: formatExpiry(v) }))}
                      keyboard="number-pad"
                      placeholder="MM/AA"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Código"
                      value={card.cvv}
                      onChange={(v) => setCard((c) => ({ ...c, cvv: digitsOnly(v).slice(0, 4) }))}
                      keyboard="number-pad"
                      secure
                      placeholder={brand === 'amex' ? '4 dígitos' : 'CVV'}
                    />
                  </View>
                </View>
              </>
            ) : null}

            {channel === 'transfer' ? (
              <View style={styles.box}>
                <Text style={styles.boxLabel}>Alias</Text>
                <Text style={styles.boxValue}>{PLATFORM_TRANSFER.alias}</Text>
                <Text style={styles.boxLabel}>Titular</Text>
                <Text style={styles.boxValue}>{PLATFORM_TRANSFER.holder}</Text>
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {channel ? (
              <Button label={paying ? 'Procesando…' : 'Confirmar pago'} onPress={confirmPay} />
            ) : null}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard,
  multiline,
  secure,
  placeholder,
  autoCap,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: 'default' | 'number-pad' | 'phone-pad' | 'email-address';
  multiline?: boolean;
  secure?: boolean;
  placeholder?: string;
  autoCap?: 'none' | 'sentences' | 'words';
  required?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>
        {label}
        {required && !value.trim() ? <Text style={styles.req}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor="rgba(51,56,63,0.32)"
        keyboardType={keyboard ?? 'default'}
        autoCapitalize={autoCap ?? (keyboard === 'email-address' ? 'none' : 'sentences')}
        multiline={multiline}
        secureTextEntry={secure}
        style={[styles.input, multiline && styles.area, value.trim() ? styles.inputFilled : null]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white, paddingTop: Platform.OS === 'ios' ? 56 : 24 },
  head: { paddingHorizontal: 18, paddingBottom: 8 },
  back: { fontFamily: fonts.sansSemi, color: colors.teal, marginBottom: 10 },
  kicker: { fontFamily: fonts.sansSemi, color: colors.muted, fontSize: 12 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, marginTop: 4 },
  scroll: { paddingHorizontal: 18, paddingBottom: 40, paddingTop: 8 },
  row: { flexDirection: 'row', gap: 10 },
  label: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  req: { color: '#E01010', letterSpacing: 0, fontFamily: fonts.sansBold },
  input: {
    backgroundColor: '#EEEDEA',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 30, 46, 0.16)',
    borderRadius: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    fontFamily: fonts.sans,
    color: colors.ink,
    fontSize: 15,
  },
  inputFilled: {
    backgroundColor: colors.white,
  },
  cityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cityValue: { fontFamily: fonts.sans, color: colors.ink, fontSize: 15, flex: 1 },
  cityChevron: { fontFamily: fonts.sans, color: colors.muted, fontSize: 12, marginLeft: 8 },
  suggest: {
    backgroundColor: '#E8E6E2',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 30, 46, 0.22)',
    borderRadius: 10,
    marginTop: -8,
    marginBottom: 12,
  },
  suggestRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(20, 30, 46, 0.1)',
  },
  suggestTitle: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 14 },
  suggestOn: { color: colors.navy },
  suggestMeta: { fontFamily: fonts.sans, color: colors.muted, fontSize: 12, marginTop: 2 },
  area: { minHeight: 88, textAlignVertical: 'top', paddingTop: 12 },
  error: { fontFamily: fonts.sansSemi, color: colors.danger, marginBottom: 12 },
  total: { fontFamily: fonts.sansExtra, color: colors.ink, fontSize: 22, marginBottom: 16 },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  methodOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  methodTxt: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 15 },
  methodTxtOn: { color: colors.white },
  kinds: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 16 },
  kind: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  kindOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  kindTxt: { fontFamily: fonts.sansBold, color: colors.ink },
  kindTxtOn: { color: colors.white },
  box: { ...surface, padding: 14, marginTop: 10, marginBottom: 16 },
  boxLabel: { fontFamily: fonts.sansSemi, color: colors.muted, fontSize: 12, marginTop: 8 },
  boxValue: { fontFamily: fonts.sansExtra, color: colors.ink, fontSize: 18, marginTop: 2 },
});
