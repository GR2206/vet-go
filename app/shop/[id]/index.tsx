import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState, useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { QtyStepper } from '@/components/ui/QtyStepper';
import { SearchField } from '@/components/ui/SearchField';
import { Stars } from '@/components/ui/Stars';
import { places } from '@/data/mock';
import { formatARS, paymentLabel, wasPrice } from '@/lib/format';
import { askShopStock } from '@/lib/live-catalog';
import { resolvePlace } from '@/lib/place';
import { matchesQuery, responseSpeedLabel } from '@/lib/shop';
import { useLiveProducts } from '@/lib/use-live-products';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export default function ShopScreen() {
  const { id, rate } = useLocalSearchParams<{ id: string; rate?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    addToCart,
    user,
    placePhotos,
    placeAvatars,
    placeReviews,
    addPlaceReview,
    updatePlaceReview,
    shopChats,
    sendShopMessage,
    favoritePlaceIds,
    toggleFavoritePlace,
    favoriteProductIds,
    toggleFavoriteProduct,
  } = useApp();
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const products = useLiveProducts();

  useEffect(() => {
    const n = Number(rate);
    if (n >= 1 && n <= 5) setStars(Math.round(n));
  }, [rate]);

  const raw = places.find((p) => p.id === id);
  const shop = raw ? resolvePlace(raw, placePhotos, placeAvatars) : undefined;
  const me = user?.name?.split(' ')[0] || 'Vos';

  const reviews = useMemo(() => {
    if (!shop) return [];
    const extras = placeReviews[shop.id] ?? [];
    const extraIds = new Set(extras.map((r) => r.id));
    return [...extras, ...shop.reviewList.filter((r) => !extraIds.has(r.id))];
  }, [shop, placeReviews]);

  const catalog = useMemo(() => {
    const list = products.filter((p) => p.shopId === id);
    if (!query.trim()) return list;
    return list.filter((p) => matchesQuery(`${p.name} ${p.description} ${p.category}`, query));
  }, [id, query, products]);

  if (!shop) {
    return (
      <View style={styles.center}>
        <Text style={styles.name}>No encontramos esta tienda</Text>
      </View>
    );
  }

  const count = shop.reviews + (placeReviews[shop.id]?.length ?? 0);
  const unreadHint = (shopChats[shop.id] ?? []).filter((m) => m.from === 'shop').length;

  const publish = () => {
    const text = comment.trim();
    if (text.length < 8) {
      Alert.alert('Calificación', 'Escribí un comentario concreto sobre el local.');
      return;
    }
    if (editId) {
      updatePlaceReview(shop.id, editId, { rating: stars, text, author: me });
      setEditId(null);
    } else {
      addPlaceReview(shop.id, { author: me, rating: stars, text });
    }
    setComment('');
    Alert.alert('Registrada', 'La opinión queda a tu nombre. El comercio no puede editarla.');
  };

  return (
    <View style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={styles.hero}>
          <Image source={{ uri: shop.photoUri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          <LinearGradient
            colors={['rgba(20,30,46,0.15)', 'rgba(20,30,46,0.35)', colors.cream]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <BackLink overlay style={{ position: 'absolute', top: insets.top + 8, left: 12, zIndex: 2 }} />
        </View>

        <View style={styles.body}>
          <Image source={{ uri: shop.avatarUri }} style={styles.avatar} />
          <Text style={styles.kicker}>
            {shop.neighborhood} · {shop.open ? 'Abierto' : 'Cerrado'} · {shop.hours}
          </Text>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{shop.name}</Text>
            <Pressable onPress={() => toggleFavoritePlace(shop.id)} hitSlop={8}>
              <Text style={styles.fav}>{favoritePlaceIds.includes(shop.id) ? '♥' : '♡'}</Text>
            </Pressable>
          </View>
          <View style={styles.rateRow}>
            <Stars value={shop.rating} size={14} />
            <Text style={styles.rateN}>
              {shop.rating.toFixed(1)} · {count} opiniones
            </Text>
          </View>
          <Text style={styles.speed}>{responseSpeedLabel(shop.responseMins)}</Text>
          <Text style={styles.blurb}>{shop.blurb}</Text>
          <Text style={styles.pay}>Acepta {shop.paymentMethods.map(paymentLabel).join(' · ')}</Text>

          <View style={styles.actions}>
            <Button
              dense
              label="Contactar"
              onPress={() => router.push(`/shop/${shop.id}/chat` as never)}
              style={{ flex: 1 }}
            />
            <View style={{ width: 10 }} />
            <Button
              dense
              label="🛒  Carrito"
              variant="ghost"
              onPress={() => router.push('/cart' as never)}
              style={{ flex: 1 }}
            />
          </View>
          {unreadHint ? (
            <Text style={styles.chatHint}>El local ya respondió en el chat · {responseSpeedLabel(shop.responseMins).toLowerCase()}</Text>
          ) : (
            <Text style={styles.chatHint}>{responseSpeedLabel(shop.responseMins)} · el equipo del local contesta desde su panel.</Text>
          )}

          <Text style={styles.section}>Productos</Text>
          <SearchField value={query} onChange={setQuery} placeholder="Buscar en esta tienda" />
          <View style={{ height: 12 }} />
          {catalog.length === 0 ? (
            <Text style={styles.hint}>No hay productos con esa búsqueda.</Text>
          ) : (
            catalog.map((product) => {
              const qty = Math.min(qtyById[product.id] ?? 1, Math.max(1, product.stock));
              const out = product.stock <= 0;
              return (
                <View key={product.id} style={styles.card}>
                  <View style={styles.top}>
                    <Image source={{ uri: product.image }} style={styles.thumb} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.prodHead}>
                        <Text style={[styles.prod, { flex: 1 }]} numberOfLines={2}>
                          {product.name}
                        </Text>
                        <Pressable onPress={() => toggleFavoriteProduct(product.id)} hitSlop={8}>
                          <Text style={styles.favSmall}>
                            {favoriteProductIds.includes(product.id) ? '♥' : '♡'}
                          </Text>
                        </Pressable>
                      </View>
                      <Text style={styles.meta} numberOfLines={2}>
                        {product.description}
                      </Text>
                      <Text style={[styles.sold, out && styles.soldOut]}>
                        {out
                          ? 'Sin stock'
                          : `${product.sold} vendidos · ${product.stock} en stock`}
                      </Text>
                      {product.discountPct ? (
                        <Text style={styles.off}>{product.discountPct}% OFF</Text>
                      ) : null}
                      <Text style={styles.price}>{formatARS(product.price)}</Text>
                      {wasPrice(product) ? <Text style={styles.was}>{wasPrice(product)}</Text> : null}
                      {product.freeShipping ? <Text style={styles.ship}>Envío gratis</Text> : null}
                    </View>
                  </View>
                  {out ? (
                    <View style={styles.addRow}>
                      <Button
                        dense
                        variant="ghost"
                        label="Avisar al local"
                        onPress={() => {
                          const who = me;
                          askShopStock({
                            shopId: shop.id,
                            productId: product.id,
                            productName: product.name,
                            tutorName: who,
                          });
                          sendShopMessage(shop.id, {
                            from: 'user',
                            author: who,
                            text: `Hola, necesito ${product.name} y figura sin stock. ¿Pueden reponer?`,
                          });
                          Alert.alert('Aviso enviado', 'El local ya sabe que no hay stock de este producto.');
                        }}
                      />
                    </View>
                  ) : (
                    <>
                      <View style={styles.qtyRow}>
                        <QtyStepper
                          value={qty}
                          max={product.stock}
                          onChange={(next) => setQtyById((prev) => ({ ...prev, [product.id]: next }))}
                        />
                      </View>
                      <View style={styles.addRow}>
                        <Button
                          dense
                          label="Agregar al carrito"
                          onPress={() => {
                            addToCart(product.id, shop.id, qty);
                            Alert.alert('En el carrito', `${qty} × ${product.name}`);
                          }}
                        />
                      </View>
                    </>
                  )}
                </View>
              );
            })
          )}

          <Text style={styles.section}>Opiniones del local</Text>
          <Text style={styles.hint}>Las publica cada tutor. El dueño no las modifica.</Text>
          {reviews.map((r) => {
            const mine = r.author === me;
            return (
              <View key={r.id} style={styles.review}>
                <View style={styles.reviewTop}>
                  <Text style={styles.author}>{r.author}</Text>
                  <Text style={styles.date}>{r.date}</Text>
                </View>
                <Stars value={r.rating} size={12} />
                {r.text?.trim() ? <Text style={styles.reviewTxt}>{r.text}</Text> : null}
                {mine ? (
                  <Pressable
                    onPress={() => {
                      setEditId(r.id);
                      setStars(r.rating);
                      setComment(r.text);
                    }}
                  >
                    <Text style={styles.editMine}>Editar mi opinión</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          <View style={styles.compose}>
            <Text style={styles.composeTitle}>{editId ? 'Corregir tu opinión' : 'Calificar esta tienda'}</Text>
            <View style={styles.starPick}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setStars(n)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 22 }}>{n <= stars ? '⭐' : '☆'}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="¿Cómo fue la atención y el envío?"
              placeholderTextColor={colors.muted}
              multiline
              style={styles.input}
            />
            <Button dense label={editId ? 'Guardar cambios' : 'Publicar opinión'} onPress={publish} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  hero: { height: 220 },
  body: { paddingHorizontal: 18, marginTop: -36 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.cream,
    backgroundColor: colors.creamDeep,
    marginBottom: 10,
  },
  kicker: { fontFamily: fonts.sansSemi, color: colors.muted, fontSize: 13 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  name: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, flex: 1 },
  fav: { fontSize: 22, color: colors.navy },
  prodHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  favSmall: { fontSize: 18, color: colors.navy, marginTop: 2 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  rateN: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13 },
  speed: { fontFamily: fonts.sansSemi, color: colors.teal, marginTop: 6, fontSize: 13 },
  blurb: { fontFamily: fonts.sans, color: colors.ink, marginTop: 10, lineHeight: 21, fontSize: 15 },
  pay: { fontFamily: fonts.sans, color: colors.muted, marginTop: 8, lineHeight: 20 },
  actions: { flexDirection: 'row', marginTop: 16 },
  chatHint: { fontFamily: fonts.sans, color: colors.muted, marginTop: 10, fontSize: 13, lineHeight: 18 },
  section: { fontFamily: fonts.sansExtra, fontSize: 18, color: colors.ink, marginTop: 22, marginBottom: 6 },
  hint: { fontFamily: fonts.sans, color: colors.muted, fontSize: 13, marginBottom: 10, lineHeight: 18 },
  review: { ...surface, padding: 12, marginBottom: 8 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  author: { fontFamily: fonts.sansBold, color: colors.ink },
  date: { fontFamily: fonts.sans, color: colors.muted, fontSize: 12 },
  reviewTxt: { fontFamily: fonts.sans, color: colors.ink, marginTop: 8, lineHeight: 20 },
  editMine: { fontFamily: fonts.sansSemi, color: colors.teal, marginTop: 8, fontSize: 13 },
  compose: { ...surface, padding: 14, marginBottom: 8 },
  composeTitle: { fontFamily: fonts.sansBold, color: colors.ink, marginBottom: 8 },
  starPick: { flexDirection: 'row', marginBottom: 8 },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
    fontFamily: fonts.sans,
    color: colors.ink,
    textAlignVertical: 'top',
    marginBottom: 10,
    backgroundColor: colors.white,
  },
  card: { ...surface, padding: 12, marginBottom: 12 },
  top: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  qtyRow: { marginTop: 12 },
  addRow: { marginTop: 10, alignItems: 'flex-end' },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: colors.creamDeep,
    borderWidth: 1,
    borderColor: colors.line,
  },
  prod: { fontFamily: fonts.sans, color: colors.ink, fontSize: 15, lineHeight: 20 },
  meta: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4, lineHeight: 18, fontSize: 13 },
  sold: { fontFamily: fonts.sans, color: colors.teal, marginTop: 4, fontSize: 12 },
  soldOut: { color: colors.danger, fontFamily: fonts.sansBold },
  off: { fontFamily: fonts.sansExtra, color: '#C47A1A', fontSize: 12, marginTop: 6, letterSpacing: 0.6 },
  price: { fontFamily: fonts.sans, color: colors.ink, fontSize: 22, marginTop: 2 },
  was: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
    textDecorationLine: 'line-through',
  },
  ship: { fontFamily: fonts.sansSemi, color: colors.teal, marginTop: 4, fontSize: 12 },
});
