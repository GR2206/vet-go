import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchField } from '@/components/ui/SearchField';
import { Stars } from '@/components/ui/Stars';
import { places } from '@/data/mock';
import { formatARS, formatKm, wasPrice } from '@/lib/format';
import { haversineKm } from '@/lib/geo';
import { resolvePlace } from '@/lib/place';
import { matchesQuery, responseSpeedLabel } from '@/lib/shop';
import { useLiveProducts } from '@/lib/use-live-products';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export default function MarketScreen() {
  const router = useRouter();
  const { cart, placePhotos, placeAvatars, origin } = useApp();
  const products = useLiveProducts();
  const [query, setQuery] = useState('');
  const count = cart.reduce((n, i) => n + i.qty, 0);

  const productHits = useMemo(() => {
    if (!query.trim()) return [];
    return products.filter((p) => matchesQuery(`${p.name} ${p.description} ${p.category}`, query)).slice(0, 8);
  }, [query, products]);

  const shops = useMemo(() => {
    const productShopIds = new Set(productHits.map((p) => p.shopId));
    return places
      .filter((p) => p.kind === 'petshop')
      .map((p) => {
        const shop = resolvePlace(p, placePhotos, placeAvatars);
        return {
          ...shop,
          distanceKm: origin ? haversineKm(origin, shop.coordinate) : shop.distanceKm,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .filter(
        (p) =>
          !query.trim() ||
          matchesQuery(`${p.name} ${p.neighborhood} ${p.blurb} ${p.address}`, query) ||
          productShopIds.has(p.id),
      );
  }, [placePhotos, placeAvatars, query, productHits, origin]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.top}>
          <View>
            <Text style={styles.kicker}>ROSARIO</Text>
            <Text style={styles.title}>Market</Text>
          </View>
          <Pressable
            style={styles.cartBtn}
            onPress={() => router.push('/cart' as never)}
            accessibilityRole="button"
            accessibilityLabel="Carrito"
          >
            <Text style={styles.cartIcon}>🛒</Text>
            {count ? (
              <View style={styles.badge}>
                <Text style={styles.badgeN}>{count}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <SearchField value={query} onChange={setQuery} placeholder="Buscar tiendas y productos" />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {productHits.length ? (
          <>
            <Text style={styles.section}>Productos</Text>
            {productHits.map((p) => {
              const shop = places.find((x) => x.id === p.shopId);
              return (
                <Pressable
                  key={p.id}
                  style={styles.prodRow}
                  onPress={() => router.push(`/shop/${p.shopId}` as never)}
                >
                  <Image source={{ uri: p.image }} style={styles.prodImg} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prodName} numberOfLines={2}>
                      {p.name}
                    </Text>
                    <Text style={styles.prodShop}>{shop?.name}</Text>
                    {p.discountPct ? <Text style={styles.prodOff}>{p.discountPct}% OFF</Text> : null}
                    <Text style={styles.prodPrice}>{formatARS(p.price)}</Text>
                    {wasPrice(p) ? <Text style={styles.prodWas}>{wasPrice(p)}</Text> : null}
                    <Text style={styles.prodMeta}>
                      {p.sold} vendidos{p.freeShipping ? ' · Envío gratis' : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </>
        ) : null}

        <Text style={styles.section}>{query.trim() ? 'Tiendas' : 'Tiendas cerca tuyo'}</Text>
        {shops.length === 0 ? (
          <Text style={styles.empty}>No hay tiendas con esa búsqueda.</Text>
        ) : (
          shops.map((shop) => (
            <Pressable key={shop.id} style={styles.shop} onPress={() => router.push(`/shop/${shop.id}` as never)}>
              <Image source={{ uri: shop.avatarUri }} style={styles.avatar} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName} numberOfLines={1}>
                  {shop.name}
                </Text>
                <Text style={styles.shopWhere}>
                  {shop.neighborhood} · {formatKm(shop.distanceKm)}
                  {shop.open ? ' · Abierto' : ' · Cerrado'}
                </Text>
                <View style={styles.rate}>
                  <Stars value={shop.rating} size={12} />
                  <Text style={styles.rateN}>
                    {shop.rating.toFixed(1)} ({shop.reviews})
                  </Text>
                </View>
                <Text style={styles.speed}>{responseSpeedLabel(shop.responseMins)}</Text>
                <Text style={styles.blurb} numberOfLines={1}>
                  {shop.blurb}
                </Text>
                {shop.delivery ? <Text style={styles.ship}>Envío en el día</Text> : null}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kicker: { fontFamily: fonts.sansBold, color: colors.teal, fontSize: 11, letterSpacing: 1.2 },
  title: { fontFamily: fonts.sansExtra, fontSize: 26, color: colors.ink },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartIcon: { fontSize: 18, marginTop: -1 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeN: { fontFamily: fonts.sansBold, color: colors.white, fontSize: 10 },
  scroll: { padding: 16, paddingBottom: 110 },
  section: { fontFamily: fonts.sansExtra, fontSize: 16, color: colors.ink, marginBottom: 10, marginTop: 6 },
  empty: { fontFamily: fonts.sans, color: colors.muted, marginBottom: 16 },
  prodRow: {
    ...surface,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    marginBottom: 10,
  },
  prodImg: { width: 88, height: 88, borderRadius: radius.sm, backgroundColor: colors.creamDeep },
  prodName: { fontFamily: fonts.sans, color: colors.ink, fontSize: 14, lineHeight: 19 },
  prodShop: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4, fontSize: 12 },
  prodOff: { fontFamily: fonts.sansExtra, color: '#C47A1A', fontSize: 11, marginTop: 4, letterSpacing: 0.5 },
  prodPrice: { fontFamily: fonts.sans, color: colors.ink, fontSize: 20, marginTop: 2 },
  prodWas: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 12,
    marginTop: 1,
    textDecorationLine: 'line-through',
  },
  prodMeta: { fontFamily: fonts.sans, color: colors.teal, marginTop: 2, fontSize: 12 },
  shop: {
    ...surface,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    marginBottom: 10,
  },
  avatar: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.creamDeep },
  shopName: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 16 },
  shopWhere: { fontFamily: fonts.sans, color: colors.muted, marginTop: 3, fontSize: 13 },
  rate: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  rateN: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 12 },
  speed: { fontFamily: fonts.sansSemi, color: colors.teal, marginTop: 4, fontSize: 12 },
  blurb: { fontFamily: fonts.sans, color: colors.ink, marginTop: 4, fontSize: 13 },
  ship: { fontFamily: fonts.sansSemi, color: colors.success, marginTop: 4, fontSize: 12 },
});
