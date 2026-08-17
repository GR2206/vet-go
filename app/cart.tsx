import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckoutSheet } from '@/components/shop/CheckoutSheet';
import { OrderList } from '@/components/shop/OrderList';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { QtyStepper } from '@/components/ui/QtyStepper';
import { places } from '@/data/mock';
import { formatARS, wasPrice } from '@/lib/format';
import { deductShopStock } from '@/lib/live-catalog';
import { resolvePlace } from '@/lib/place';
import { useLiveProducts } from '@/lib/use-live-products';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export default function CartScreen() {
  const router = useRouter();
  const { cart, changeQty, clearShopCart, user, placePhotos, saveShipping, addShopOrder, shopOrders } = useApp();
  const products = useLiveProducts();
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const shopIds = [...new Set(cart.map((i) => i.shopId))];
  const count = cart.reduce((n, i) => n + i.qty, 0);
  const grand = cart.reduce((sum, i) => {
    const p = products.find((x) => x.id === i.productId);
    return sum + (p?.price ?? 0) * i.qty;
  }, 0);
  const checkoutShop = checkoutId
    ? resolvePlace(places.find((p) => p.id === checkoutId) ?? places[0], placePhotos)
    : undefined;
  const checkoutTotal = cart
    .filter((i) => i.shopId === checkoutId)
    .reduce((sum, i) => {
      const p = products.find((x) => x.id === i.productId);
      return sum + (p?.price ?? 0) * i.qty;
    }, 0);

  const bump = (id: string, delta: number) => {
    Haptics.selectionAsync().catch(() => undefined);
    changeQty(id, delta);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <BackLink />
        <Text style={styles.title}>Carrito</Text>
        <Text style={styles.subtitle}>
          {count === 0
            ? 'Sin productos todavía'
            : count === 1
              ? '1 producto'
              : `${count} productos`}
        </Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {cart.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
            <Text style={styles.emptyText}>Cuando agregues algo del Market, aparece acá listo para pagar.</Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.replace('/(tabs)/market' as never)}>
              <Text style={styles.emptyBtnText}>Ir al Market</Text>
            </Pressable>
          </View>
        ) : (
          shopIds.map((shopId) => {
            const shop = resolvePlace(places.find((p) => p.id === shopId) ?? places[0], placePhotos);
            const items = cart.filter((i) => i.shopId === shopId);
            const units = items.reduce((n, i) => n + i.qty, 0);
            const subtotal = items.reduce((sum, i) => {
              const p = products.find((x) => x.id === i.productId);
              return sum + (p?.price ?? 0) * i.qty;
            }, 0);
            const shipsFree = items.some((i) => products.find((x) => x.id === i.productId)?.freeShipping);
            return (
              <View key={shopId} style={styles.block}>
                <View style={styles.seller}>
                  <Image source={{ uri: shop.photoUri }} style={styles.shopPhoto} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sellerName}>{shop.name}</Text>
                    <Text style={styles.sellerMeta}>
                      {shop.neighborhood}
                      {shop.delivery ? ' · Envío a domicilio' : ''}
                    </Text>
                  </View>
                </View>
                {items.map((item) => {
                  const p = products.find((x) => x.id === item.productId);
                  if (!p) return null;
                  const line = p.price * item.qty;
                  const list = wasPrice(p);
                  return (
                    <View key={item.productId} style={styles.row}>
                      <Image source={{ uri: p.image }} style={styles.thumb} />
                      <View style={styles.info}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {p.name}
                        </Text>
                        <Text style={styles.itemMeta}>
                          {p.category} · {p.unit}
                        </Text>
                        <View style={styles.tags}>
                          {p.discountPct ? <Text style={styles.off}>{p.discountPct}% OFF</Text> : null}
                          {p.freeShipping ? <Text style={styles.ship}>Envío gratis</Text> : null}
                        </View>
                        <View style={styles.priceRow}>
                          <Text style={styles.unitPrice}>{formatARS(p.price)}</Text>
                          {list ? <Text style={styles.was}>{list}</Text> : null}
                        </View>
                        <View style={styles.lineRow}>
                          <QtyStepper
                            value={item.qty}
                            min={0}
                            max={p.stock}
                            onChange={(next) => bump(item.productId, next - item.qty)}
                          />
                          <Text style={styles.lineTotal}>{formatARS(line)}</Text>
                        </View>
                        <Pressable onPress={() => bump(item.productId, -item.qty)} hitSlop={6}>
                          <Text style={styles.remove}>Quitar</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                <View style={styles.sellerFoot}>
                  <Text style={styles.footMeta}>
                    {units === 1 ? '1 producto' : `${units} productos`}
                    {shipsFree ? ' · envío gratis' : ''}
                  </Text>
                  <Text style={styles.subtotal}>Subtotal {formatARS(subtotal)}</Text>
                </View>
              </View>
            );
          })
        )}
        <OrderList orders={shopOrders} />
      </ScrollView>

      {cart.length > 0 ? (
        <SafeAreaView edges={['bottom']} style={styles.barSafe}>
          <View style={styles.bar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.barLabel}>
                Total · {count === 1 ? '1 producto' : `${count} productos`}
              </Text>
              <Text style={styles.barTotal}>{formatARS(grand)}</Text>
            </View>
            <Button compact label="Comprar" onPress={() => setCheckoutId(shopIds[0])} />
          </View>
        </SafeAreaView>
      ) : null}

      <CheckoutSheet
        open={Boolean(checkoutId)}
        shop={checkoutShop}
        total={checkoutTotal}
        initial={user?.shipping}
        defaults={{
          name: user?.name,
          email: user?.email,
          phone: user?.phone,
          zone: user?.zone,
        }}
        onClose={() => setCheckoutId(null)}
        onConfirm={(shipping, split, pay) => {
          if (!checkoutId) return;
          const items = cart
            .filter((i) => i.shopId === checkoutId)
            .map((i) => {
              const p = products.find((x) => x.id === i.productId);
              return {
                productId: i.productId,
                name: p?.name ?? 'Producto',
                qty: i.qty,
                unitPrice: p?.price ?? 0,
              };
            });
          addShopOrder({
            id: `ord-${Date.now()}`,
            shopId: checkoutId,
            items,
            gross: split.gross,
            fee: split.fee,
            net: split.net,
            method: pay.method,
            payKind: pay.payKind,
            cardBrand: pay.cardBrand,
            cardLast4: pay.cardLast4,
            status: 'payout_pending',
            shipping,
            createdAt: Date.now(),
            paidAt: Date.now(),
          });
          deductShopStock(
            checkoutId,
            items.map((i) => ({ productId: i.productId, qty: i.qty })),
          );
          saveShipping(shipping);
          clearShopCart(checkoutId);
          setCheckoutId(null);
          Alert.alert('Pago confirmado');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { fontFamily: fonts.sansExtra, fontSize: 22, color: colors.ink },
  subtitle: { fontFamily: fonts.sans, color: colors.muted, fontSize: 13, marginTop: 2 },
  scroll: { paddingBottom: 18, paddingHorizontal: 16, paddingTop: 14 },
  empty: { ...surface, padding: 22 },
  emptyTitle: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.ink },
  emptyText: { fontFamily: fonts.sans, color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  emptyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    marginTop: 14,
  },
  emptyBtnText: { fontFamily: fonts.sansBold, color: colors.white },
  block: {
    ...surface,
    marginBottom: 14,
  },
  seller: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shopPhoto: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.creamDeep,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sellerName: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 15 },
  sellerMeta: { fontFamily: fonts.sans, color: colors.muted, marginTop: 3, fontSize: 12 },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 12,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
    backgroundColor: colors.creamDeep,
    borderWidth: 1,
    borderColor: colors.line,
  },
  info: { flex: 1 },
  itemName: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 14, lineHeight: 19 },
  itemMeta: { fontFamily: fonts.sans, color: colors.muted, fontSize: 12, marginTop: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  off: { fontFamily: fonts.sansExtra, color: '#C47A1A', fontSize: 11, letterSpacing: 0.4 },
  ship: { fontFamily: fonts.sansSemi, color: colors.teal, fontSize: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 },
  unitPrice: { fontFamily: fonts.sans, color: colors.ink, fontSize: 16 },
  was: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  lineTotal: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 15 },
  remove: { fontFamily: fonts.sansSemi, color: colors.muted, fontSize: 12, marginTop: 8 },
  sellerFoot: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  footMeta: { fontFamily: fonts.sans, color: colors.muted, fontSize: 12, flex: 1 },
  subtotal: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13 },
  barSafe: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  bar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barLabel: { fontFamily: fonts.sans, color: colors.muted, fontSize: 12 },
  barTotal: { fontFamily: fonts.sansExtra, color: colors.ink, fontSize: 20, marginTop: 1 },
});
