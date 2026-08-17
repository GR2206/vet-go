import { Image } from 'expo-image';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeroBackdrop } from '@/components/home/HeroBackdrop';
import { PawTrail } from '@/components/home/PawTrail';
import { PetHousehold } from '@/components/home/PetHousehold';
import { TodayFeed } from '@/components/home/TodayFeed';
import { WellbeingRing } from '@/components/home/WellbeingRing';
import { EdgeFadeRow } from '@/components/ui/EdgeFadeRow';
import { StaffCard } from '@/components/ui/StaffCard';
import { places, professionals } from '@/data/mock';
import { nearbyShopDeals } from '@/lib/deals';
import { formatARS, formatKm, wasPrice } from '@/lib/format';
import { cardIn } from '@/lib/motion';
import { upcomingPendings } from '@/lib/pending';
import { rankStaffByPeopleAndPlace, resolveStaff } from '@/lib/staff';
import { todayInsights } from '@/lib/today';
import { useLiveProducts } from '@/lib/use-live-products';
import { fetchWeather, type WeatherNow } from '@/lib/weather';
import { careTone, petWellbeing } from '@/lib/wellbeing';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const focused = useIsFocused();
  const {
    pet,
    pets,
    activePetId,
    setActivePet,
    updatePet,
    addPet,
    user,
    staffPhotos,
    heroBackdrop,
    setHeroBackdrop,
    bookings,
    walkBookings,
    origin,
    ensureOrigin,
    placeReviews,
    favoriteProductIds,
    toggleFavoriteProduct,
  } = useApp();
  const catalog = useLiveProducts();
  const pendingCount = upcomingPendings(bookings, walkBookings).length;
  const name = pet?.name ?? 'Max';
  const firstName = user?.name?.split(' ')[0] ?? 'Gino';
  const [nowTick, setNowTick] = useState(0);
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!focused) return;
    let cancelled = false;
    (async () => {
      const here = await ensureOrigin();
      if (cancelled) return;
      const next = await fetchWeather(here.latitude, here.longitude);
      if (!cancelled) setWeather(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [focused, ensureOrigin]);
  const wellbeing = useMemo(() => petWellbeing(pet, bookings), [pet, bookings, nowTick]);
  const insights = useMemo(
    () => todayInsights(pet, bookings, walkBookings, { origin, weather }),
    [pet, bookings, walkBookings, nowTick, focused, origin, weather],
  );
  const featuredStaff = useMemo(
    () =>
      rankStaffByPeopleAndPlace(
        professionals.map((pro) => resolveStaff(pro, staffPhotos)),
        origin,
        placeReviews,
      ).slice(0, 6),
    [staffPhotos, origin, placeReviews],
  );
  const recDeals = useMemo(() => nearbyShopDeals(pet, origin, catalog), [pet, origin, catalog]);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const capsules = [
    { label: `¿Dónde está ${name}?`, emoji: '📍', to: '/(tabs)/locate' },
    { label: 'Pendientes', emoji: '🔔', to: '/pending' },
    { label: 'Pasear', emoji: '🐾', to: '/walkers' },
    { label: 'Salud', emoji: '💚', to: '/consult' },
    { label: 'Cuidados', emoji: '🛁', to: '/booking/luna' },
    { label: 'Market', emoji: '🛒', to: '/(tabs)/market' },
    { label: 'Cerca', emoji: '🗺️', to: '/(tabs)/map' },
    { label: 'Actividad', emoji: '🗓️', to: '/history' },
  ];

  return (
    <View style={styles.root}>
      {focused ? <StatusBar style="light" /> : null}
      <HeroBackdrop kind={heroBackdrop} scrollY={scrollY} />
      <PawTrail active={focused} />
      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <View style={styles.heroText}>
              <View style={styles.heroTop}>
                <Text style={styles.hi} numberOfLines={1}>
                  Hola, {firstName} 👋
                </Text>
                <View style={styles.switcher}>
                  <Pressable
                    onPress={() => setHeroBackdrop('landscapes')}
                    style={[styles.chip, heroBackdrop === 'landscapes' && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, heroBackdrop === 'landscapes' && styles.chipTextOn]}>
                      Paisaje
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setHeroBackdrop('linear')}
                    style={[styles.chip, heroBackdrop === 'linear' && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, heroBackdrop === 'linear' && styles.chipTextOn]}>Color</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.question}>¿Qué necesita {name} hoy?</Text>
            </View>
            <EdgeFadeRow fadeItems contentContainerStyle={styles.caps}>
              {capsules.map((c) => (
                <Pressable key={c.label} style={styles.cap} onPress={() => router.push(c.to as never)}>
                  <Text style={styles.capEmoji}>{c.emoji}</Text>
                  <Text style={styles.capText}>{c.label}</Text>
                  {c.to === '/pending' ? <PendingPulse count={pendingCount} active={focused} /> : null}
                </Pressable>
              ))}
            </EdgeFadeRow>
          </SafeAreaView>
        </View>

        <View style={styles.sheet}>
          <Animated.View entering={cardIn(40)}>
            <PetHousehold
              pets={pets}
              activeId={activePetId}
              points={user?.points ?? 0}
              vip={Boolean(user?.vip)}
              onSelect={setActivePet}
              onUpdate={updatePet}
              onAdd={(species) => addPet({ name: species === 'dog' ? 'Coco' : 'Michi', species })}
            />
          </Animated.View>

          <Animated.View entering={cardIn(110)} style={styles.pad}>
            <View style={[styles.status, wellbeing.alarm && styles.statusAlarm]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusKicker, wellbeing.alarm && { color: wellbeing.color }]}>
                  {name.toUpperCase()} HOY
                </Text>
                {wellbeing.items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(item.to as never)}
                    style={styles.careRow}
                  >
                    <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.careLabel, { color: careTone(item.level) }]}>{item.label}</Text>
                      <Text style={[styles.careDetail, item.level === 'alarm' && styles.careAlarm]}>
                        {item.detail}
                      </Text>
                    </View>
                  </Pressable>
                ))}
                <Text style={[styles.ok, wellbeing.alarm && styles.okAlarm]}>{wellbeing.headline}</Text>
              </View>
              <View style={styles.ringWrap}>
                <WellbeingRing value={wellbeing.value} color={wellbeing.color} />
                <View style={styles.ringLabel}>
                  <Text style={[styles.ringN, { color: wellbeing.alarm ? wellbeing.color : colors.ink }]}>
                    {wellbeing.value}%
                  </Text>
                  <Text style={styles.ringL}>Cuidado</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={cardIn(180)} style={styles.pad}>
            <TodayFeed
              name={name}
              items={insights}
              onOpen={(to) => router.push(to as never)}
            />
          </Animated.View>

          <View style={styles.padHead}>
            <Text style={styles.section}>Equipo cerca · recomendados</Text>
          </View>
          <Animated.View entering={cardIn(320)}>
            <EdgeFadeRow fadeColor={colors.white} contentContainerStyle={styles.staffRow}>
              {featuredStaff.map((pro) => {
                const place = places.find((p) => p.id === pro.placeId);
                return (
                  <StaffCard
                    key={pro.id}
                    pro={pro}
                    slim
                    placeLabel={`${place?.name ?? ''} · ${pro.recLabel}`}
                    onPress={() => router.push(`/booking/${pro.placeId}`)}
                  />
                );
              })}
            </EdgeFadeRow>
          </Animated.View>

          <View style={styles.padHead}>
            <Text style={styles.section}>Recomendado para {name}</Text>
          </View>
          <Animated.View entering={cardIn(380)}>
            <EdgeFadeRow fadeColor={colors.white} contentContainerStyle={styles.planRow}>
              {recDeals.length ? (
                recDeals.map((deal) => (
                  <Pressable
                    key={deal.product.id}
                    style={styles.plan}
                    onPress={() => router.push(deal.to as never)}
                  >
                    <Image source={{ uri: deal.product.image }} style={styles.planImg} />
                    <View style={{ padding: 12 }}>
                      <Text style={styles.planName}>{deal.kicker}</Text>
                      <Text style={styles.planPerk} numberOfLines={2}>
                        {deal.product.name}
                      </Text>
                      <Text style={styles.planPrice}>{formatARS(deal.product.price)}</Text>
                      {wasPrice(deal.product) ? (
                        <Text style={styles.was}>{wasPrice(deal.product)}</Text>
                      ) : null}
                      <Text style={styles.social}>
                        {deal.shopName} · {formatKm(deal.km)}
                        {deal.nearby ? '' : ' · lo más cerca'}
                      </Text>
                      <Pressable
                        onPress={() => toggleFavoriteProduct(deal.product.id)}
                        hitSlop={8}
                        style={{ marginTop: 8 }}
                      >
                        <Text style={styles.link}>
                          {favoriteProductIds.includes(deal.product.id) ? '♥ Guardado' : '♡ Guardar'}
                        </Text>
                      </Pressable>
                    </View>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.planPerk}>No hay productos cargados todavía.</Text>
              )}
            </EdgeFadeRow>
          </Animated.View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function PendingPulse({ count, active }: { count: number; active: boolean }) {
  const beat = useSharedValue(0);

  useEffect(() => {
    if (!count || !active) {
      cancelAnimation(beat);
      beat.value = 0;
      return;
    }
    beat.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 680, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1600 }),
      ),
      -1,
      false,
    );
  }, [count, active, beat]);

  const globo = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + beat.value * 0.1 }],
  }));
  const ring = useAnimatedStyle(() => ({
    opacity: interpolate(beat.value, [0, 1], [0.4, 0]),
    transform: [{ scale: interpolate(beat.value, [0, 1], [1, 1.75]) }],
  }));

  if (!count) return null;

  return (
    <View style={styles.pulseWrap} pointerEvents="none">
      <Animated.View style={[styles.capGloboRing, ring]} />
      <Animated.View style={[styles.capGlobo, globo]}>
        <Text style={styles.capGloboN}>{count}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
    borderBottomLeftRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
  },
  scroll: { paddingBottom: 10 },
  hero: { paddingBottom: 36, minHeight: 268 },
  heroText: { paddingHorizontal: 20, paddingTop: 8 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  hi: { fontFamily: fonts.sansExtra, color: colors.white, fontSize: 22, flex: 1 },
  switcher: { flexDirection: 'row', gap: 6 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  chipOn: { backgroundColor: 'rgba(255,255,255,0.82)' },
  chipText: { fontFamily: fonts.sansSemi, color: colors.white, fontSize: 11 },
  chipTextOn: { color: colors.navy },
  question: { fontFamily: fonts.display, color: colors.white, fontSize: 28, marginTop: 6, lineHeight: 32 },
  caps: { gap: 8, marginTop: 14, paddingHorizontal: 16, paddingRight: 22, paddingBottom: 8, paddingTop: 10 },
  cap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    position: 'relative',
  },
  capEmoji: { fontSize: 14 },
  capText: { fontFamily: fonts.sansSemi, color: colors.navy, fontSize: 13 },
  pulseWrap: {
    position: 'absolute',
    top: -7,
    right: -7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capGloboRing: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
  },
  capGlobo: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capGloboN: { fontFamily: fonts.sansBold, color: colors.white, fontSize: 10 },
  sheet: {
    paddingBottom: 28,
    marginBottom: 12,
  },
  pad: { paddingHorizontal: 16, marginTop: 18 },
  padHead: { paddingHorizontal: 16, marginTop: 18 },
  section: { fontFamily: fonts.sansExtra, fontSize: 18, color: colors.ink, marginBottom: 10 },
  staffRow: { gap: 10, paddingHorizontal: 16, paddingRight: 28, paddingBottom: 6 },
  planRow: { gap: 12, paddingHorizontal: 16, paddingRight: 28, paddingBottom: 8 },
  status: {
    ...surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusAlarm: {
    borderColor: '#E01010',
    borderWidth: 1.5,
  },
  statusKicker: { fontFamily: fonts.sansBold, color: colors.teal, letterSpacing: 1, fontSize: 12, marginBottom: 4 },
  careRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  careLabel: { fontFamily: fonts.sansSemi, fontSize: 14 },
  careDetail: { fontFamily: fonts.sans, color: colors.muted, fontSize: 12, marginTop: 1 },
  careAlarm: { color: '#E01010', fontFamily: fonts.sansSemi },
  ok: { fontFamily: fonts.sansSemi, color: colors.muted, marginTop: 10, fontSize: 13 },
  okAlarm: { color: '#E01010' },
  ringWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', alignItems: 'center' },
  ringN: { fontFamily: fonts.sansExtra, color: colors.ink, fontSize: 14 },
  ringL: { fontFamily: fonts.sans, color: colors.muted, fontSize: 9 },
  link: { fontFamily: fonts.sansBold, color: colors.goldDeep, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  plan: {
    width: 220,
    ...surface,
    overflow: 'hidden',
  },
  planImg: {
    width: '100%',
    height: 110,
    backgroundColor: colors.creamDeep,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  planName: { fontFamily: fonts.sansExtra, color: colors.ink, fontSize: 16 },
  planPerk: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4 },
  planPrice: { fontFamily: fonts.sansBold, color: colors.ink, marginTop: 8 },
  social: { fontFamily: fonts.sans, color: colors.goldDeep, marginTop: 6, fontSize: 12 },
  was: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    textDecorationLine: 'line-through',
  },
});
