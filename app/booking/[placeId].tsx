import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { EdgeFadeRow } from '@/components/ui/EdgeFadeRow';
import { SearchField } from '@/components/ui/SearchField';
import { StaffCard } from '@/components/ui/StaffCard';
import { places, professionals, services, slots, weekDays } from '@/data/mock';
import { formatARS, formatKm } from '@/lib/format';
import { freeSlotsOnDay } from '@/lib/grooming';
import { clockRise } from '@/lib/motion';
import { startOfDay } from '@/lib/dates';
import { appointmentAt } from '@/lib/schedule';
import { resolvePlace } from '@/lib/place';
import { isGroomStaff, isVetStaff, rankStaffByPeopleAndPlace, resolveStaff } from '@/lib/staff';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

const SERVICE_OPTIONS = [
  { key: 'consulta', name: 'Consulta general', minutes: 30, category: 'clinic' as const },
  { key: 'vacuna', name: 'Vacunación', minutes: 20, category: 'clinic' as const },
  { key: 'control', name: 'Control clínico', minutes: 30, category: 'clinic' as const },
  { key: 'bano-corte', name: 'Baño y corte', minutes: 75, category: 'grooming' as const },
  { key: 'bano', name: 'Baño', minutes: 45, category: 'grooming' as const },
];

function matchService(key: string, placeId: string) {
  const opt = SERVICE_OPTIONS.find((s) => s.key === key);
  if (!opt) return services[0];
  const local = services.filter((s) => s.placeId === placeId && s.category === opt.category);
  if (key === 'bano-corte') {
    return local.find((s) => s.name.toLowerCase().includes('corte')) ?? services.find((s) => s.id === 'bano-corte');
  }
  if (key === 'bano') {
    return (
      local.find((s) => s.name.toLowerCase() === 'baño') ??
      local.find((s) => s.name.toLowerCase().includes('baño') && !s.name.toLowerCase().includes('corte')) ??
      services.find((s) => s.id === 'bano')
    );
  }
  return local.find((s) => s.id === key || s.name === opt.name) ?? services.find((s) => s.id === key);
}

export default function BookingScreen() {
  const { placeId: routePlaceId } = useLocalSearchParams<{ placeId: string }>();
  const router = useRouter();
  const { addBooking, bookings, vouchers, placePhotos, placeAvatars, staffPhotos, servicePrices, origin, placeReviews } = useApp();
  const start = places.find((p) => p.id === routePlaceId);
  const groomingPlaces = places.filter((p) => p.kind === 'grooming');

  const [placeId, setPlaceId] = useState(routePlaceId ?? 'san-martin');
  const [serviceKey, setServiceKey] = useState(
    start?.kind === 'grooming' ? 'bano-corte' : start?.id === 'vet-parque' ? 'control' : 'consulta',
  );
  const [proId, setProId] = useState('any');
  const [time, setTime] = useState(slots[2]);
  const [day, setDay] = useState(
    weekDays.find((w) => w.n === new Date().getDate())?.n ?? weekDays[0].n,
  );
  const [pickSalon, setPickSalon] = useState(false);
  const [pickService, setPickService] = useState(false);
  const [salonQuery, setSalonQuery] = useState('');

  const option = SERVICE_OPTIONS.find((s) => s.key === serviceKey) ?? SERVICE_OPTIONS[0];
  const grooming = option.category === 'grooming';

  useEffect(() => {
    const current = places.find((p) => p.id === placeId);
    if (grooming && current?.kind !== 'grooming') {
      setPlaceId(groomingPlaces[0]?.id ?? 'luna');
      setProId('any');
    }
    if (!grooming && current?.kind === 'grooming') {
      setPlaceId(start?.kind === 'grooming' ? 'san-martin' : (routePlaceId ?? 'san-martin'));
      setProId('any');
    }
    setPickSalon(false);
    setPickService(false);
  }, [grooming]);

  const raw = places.find((p) => p.id === placeId);
  const place = raw ? resolvePlace(raw, placePhotos, placeAvatars) : undefined;
  const service = matchService(serviceKey, placeId);
  const listedPrice = service ? (servicePrices[service.id] ?? service.price) : undefined;

  const staff = useMemo(() => {
    const list = rankStaffByPeopleAndPlace(
      professionals.map((p) => resolveStaff(p, staffPhotos)),
      origin,
      placeReviews,
    ).filter((p) => (grooming ? isGroomStaff(p) : isVetStaff(p)));
    if (grooming && place?.kind === 'grooming') return list.filter((p) => p.placeId === place.id);
    return list;
  }, [grooming, place?.id, place?.kind, staffPhotos, origin, placeReviews]);

  const salons = groomingPlaces
    .map((p) => resolvePlace(p, placePhotos, placeAvatars))
    .filter((p) => {
      const q = salonQuery.trim().toLowerCase();
      if (!q) return true;
      return `${p.name} ${p.neighborhood} ${p.address}`.toLowerCase().includes(q);
    });

  const voucher = vouchers.find((v) => v.left > 0);
  const openSlots = useMemo(() => {
    if (!raw) return slots;
    return freeSlotsOnDay(raw, bookings, startOfDay(appointmentAt(day, '00:00')));
  }, [raw, bookings, day]);

  useEffect(() => {
    if (!openSlots.length) return;
    if (!openSlots.includes(time)) setTime(openSlots[0]);
  }, [openSlots, time]);

  if (!place) {
    return (
      <View style={styles.center}>
        <Text>Local no encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
      <Image source={{ uri: place.photoUri }} style={styles.cover} />
      <Text style={styles.kicker}>{place.neighborhood}</Text>
      <Text style={styles.title}>{place.name}</Text>

      <Text style={styles.step}>1 · Servicio</Text>
      <Pressable
        onPress={() => setPickService((v) => !v)}
        style={[styles.row, styles.salonBtn, pickService && styles.on]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{option.name}</Text>
          <Text style={styles.rowMeta}>
            {option.minutes} min{listedPrice != null ? ` · ${formatARS(listedPrice)}` : ''}
          </Text>
        </View>
        <Text style={styles.chev}>{pickService ? '⌃' : '⌄'}</Text>
      </Pressable>
      <Modal visible={pickService} transparent animationType="fade" onRequestClose={() => setPickService(false)}>
        <BlurPick onClose={() => setPickService(false)}>
          <Text style={styles.menuTitle}>Servicio</Text>
          {SERVICE_OPTIONS.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => {
                setServiceKey(s.key);
                setProId('any');
                setPickService(false);
              }}
              style={[styles.menuRow, serviceKey === s.key && styles.on]}
            >
              <Text style={styles.rowTitle}>{s.name}</Text>
              <Text style={styles.rowMeta}>{s.minutes} min</Text>
            </Pressable>
          ))}
        </BlurPick>
      </Modal>

      {grooming ? (
        <>
          <Text style={styles.step}>2 · Peluquería</Text>
          <Pressable
            onPress={() => setPickSalon((v) => !v)}
            style={[styles.row, styles.salonBtn, pickSalon && styles.on]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{place.kind === 'grooming' ? place.name : 'Elegir peluquería'}</Text>
              {place.kind === 'grooming' ? (
                <Text style={styles.rowMeta}>
                  {place.neighborhood} · {formatKm(place.distanceKm)}
                </Text>
              ) : null}
            </View>
            <Text style={styles.chev}>{pickSalon ? '⌃' : '⌄'}</Text>
          </Pressable>
          <Modal
            visible={pickSalon}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setPickSalon(false);
              setSalonQuery('');
            }}
          >
            <BlurPick
              onClose={() => {
                setPickSalon(false);
                setSalonQuery('');
              }}
            >
              <Text style={styles.menuTitle}>Peluquería</Text>
              <View style={{ marginBottom: 10 }}>
                <SearchField value={salonQuery} onChange={setSalonQuery} placeholder="Buscar peluquería" />
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" style={styles.menuScroll}>
                {salons.map((salon) => (
                  <Pressable
                    key={salon.id}
                    onPress={() => {
                      setPlaceId(salon.id);
                      setProId('any');
                      setPickSalon(false);
                      setSalonQuery('');
                    }}
                    style={[styles.salonRow, placeId === salon.id && styles.on]}
                  >
                    <Image source={{ uri: salon.avatarUri }} style={styles.salonPhoto} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{salon.name}</Text>
                      <Text style={styles.rowMeta}>
                        {salon.neighborhood} · {formatKm(salon.distanceKm)} · ★ {salon.rating}
                        {` · ${freeSlotsOnDay(salon, bookings, startOfDay(appointmentAt(day, '00:00'))).length} cupos`}
                      </Text>
                    </View>
                  </Pressable>
                ))}
                {salons.length === 0 ? <Text style={styles.empty}>No hay peluquerías con esa búsqueda.</Text> : null}
              </ScrollView>
            </BlurPick>
          </Modal>
        </>
      ) : (
        <Text style={styles.step}>2 · Profesional</Text>
      )}

      {grooming ? <Text style={styles.step}>3 · Peluquera</Text> : null}

      <Pressable onPress={() => setProId('any')} style={[styles.row, proId === 'any' && styles.on]}>
        <Text style={styles.rowTitle}>Cualquier profesional disponible</Text>
      </Pressable>
      <EdgeFadeRow fadeColor={colors.white} style={{ marginHorizontal: -18 }} contentContainerStyle={styles.carousel}>
        {staff.map((p) => (
          <StaffCard
            key={p.id}
            pro={p}
            slim
            selected={proId === p.id}
            placeLabel={`${places.find((x) => x.id === p.placeId)?.name ?? ''} · ${p.recLabel}`}
            onPress={() => {
              setProId(p.id);
              setPlaceId(p.placeId);
            }}
          />
        ))}
      </EdgeFadeRow>

      <Text style={styles.step}>{grooming ? '4 · Día y horario' : '3 · Día y horario'}</Text>
      <EdgeFadeRow
        fadeColor={colors.white}
        style={{ marginHorizontal: -18 }}
        contentContainerStyle={styles.days}
      >
        {weekDays.map((w) => (
          <Pressable
            key={w.n}
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              setDay(w.n);
            }}
            style={[styles.day, day === w.n && styles.dayOn]}
          >
            <Text style={[styles.dayD, day === w.n && styles.dayOnText]}>{w.d}</Text>
            <Text style={[styles.dayN, day === w.n && styles.dayOnText]}>{w.n}</Text>
          </Pressable>
        ))}
      </EdgeFadeRow>
      <View style={styles.slots}>
        {openSlots.length === 0 ? (
          <Text style={styles.empty}>No quedan turnos en este día.</Text>
        ) : (
          openSlots.map((s, i) => (
            <Animated.View key={`${day}-${s}`} entering={clockRise.delay(i * 42)}>
              <Pressable onPress={() => setTime(s)} style={[styles.slot, time === s && styles.slotOn]}>
                <Text style={[styles.slotText, time === s && styles.slotTextOn]}>{s}</Text>
              </Pressable>
            </Animated.View>
          ))
        )}
      </View>

      <Button
        label={voucher ? `Confirmar y canjear ${voucher.label}` : `Reservar turno`}
        onPress={() => {
          if (!openSlots.includes(time)) return;
          const picked = weekDays.find((w) => w.n === day);
          const chosen = proId === 'any' ? staff[0] : staff.find((p) => p.id === proId);
          const bookedPlace = chosen?.placeId ?? place.id;
          const bookedService = matchService(serviceKey, bookedPlace);
          addBooking({
            id: `b-${Date.now()}`,
            placeId: bookedPlace,
            serviceId: bookedService?.id ?? service?.id ?? 'consulta',
            professionalId: chosen?.id ?? staff[0]?.id ?? 'alejandro',
            dateLabel: `${picked?.d} ${picked?.n} ago`,
            time,
            at: appointmentAt(day, time),
            status: 'confirmed',
            usedVoucher: Boolean(voucher),
          });
          Alert.alert(
            'Turno confirmado',
            `${option.name} · ${picked?.d} ${picked?.n} a las ${time}. Quedó en Pendientes.`,
            [{ text: 'Ver pendientes', onPress: () => router.replace('/pending' as never) }],
          );
        }}
      />
    </ScrollView>
  );
}

function BlurPick({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={styles.modalRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <BlurView
          intensity={42}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.dim} />
      </Pressable>
      <View style={styles.sheetMenu} pointerEvents="box-none">
        <View style={styles.menu}>{children}</View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: 18, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: fonts.sansSemi, color: colors.muted },
  cover: {
    width: '100%',
    height: 160,
    borderRadius: radius.lg,
    backgroundColor: colors.creamDeep,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, marginBottom: 16 },
  step: { fontFamily: fonts.sansExtra, color: colors.ink, marginTop: 10, marginBottom: 8 },
  row: {
    ...surface,
    padding: 14,
    marginBottom: 8,
  },
  salonBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chev: { fontFamily: fonts.sansBold, color: colors.muted, fontSize: 18 },
  modalRoot: { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12, 14, 18, 0.28)' },
  sheetMenu: { alignItems: 'stretch' },
  menu: {
    ...surface,
    padding: 10,
    backgroundColor: colors.white,
  },
  menuTitle: {
    fontFamily: fonts.sansExtra,
    color: colors.ink,
    fontSize: 16,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  menuRow: {
    ...surface,
    padding: 14,
    marginBottom: 8,
    backgroundColor: colors.cream,
  },
  salonRow: {
    ...surface,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    backgroundColor: colors.cream,
  },
  salonPhoto: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.creamDeep },
  menuScroll: { maxHeight: 320 },
  empty: { fontFamily: fonts.sans, color: colors.muted, paddingVertical: 8 },
  on: { borderColor: colors.navy, borderWidth: 1.5 },
  rowTitle: { fontFamily: fonts.sansBold, color: colors.ink },
  rowMeta: { fontFamily: fonts.sans, color: colors.muted, marginTop: 3 },
  carousel: { gap: 10, paddingHorizontal: 18, paddingBottom: 8 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 20, marginTop: 4 },
  days: { gap: 7, paddingHorizontal: 18, paddingBottom: 10 },
  day: {
    width: 44,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  dayOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  dayD: { fontFamily: fonts.sans, color: colors.muted, fontSize: 10 },
  dayN: { fontFamily: fonts.sansExtra, color: colors.ink, fontSize: 15, marginTop: 1 },
  dayOnText: { color: colors.white },
  slot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  slotOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  slotText: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13 },
  slotTextOn: { color: colors.white },
});
