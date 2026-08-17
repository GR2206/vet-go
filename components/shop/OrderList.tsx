import { Image } from 'expo-image';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { places, products } from '@/data/mock';
import type { ShopOrder } from '@/data/types';
import { brandLabel } from '@/lib/card';
import { formatARS } from '@/lib/format';
import { checkoutMethodLabel } from '@/lib/pay';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export function OrderList({ orders }: { orders: ShopOrder[] }) {
  const { removeShopOrder, clearShopOrders } = useApp();

  if (!orders.length) return null;

  const removeOne = (id: string) => {
    Alert.alert('Eliminar compra', 'Se saca esta compra del historial. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => removeShopOrder(id) },
    ]);
  };

  const removeAll = () => {
    Alert.alert('Borrar historial', 'Se eliminan todas las compras guardadas en este dispositivo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar todo', style: 'destructive', onPress: () => clearShopOrders() },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>Compras</Text>
        <Pressable onPress={removeAll} hitSlop={8}>
          <Text style={styles.clear}>Borrar historial</Text>
        </Pressable>
      </View>
      {orders.map((order) => {
        const shop = places.find((p) => p.id === order.shopId);
        const pay =
          order.method === 'card'
            ? `${brandLabel(order.cardBrand ?? 'unknown')}${order.payKind === 'debit' ? ' débito' : ' crédito'}${
                order.cardLast4 ? ` ···· ${order.cardLast4}` : ''
              }`
            : checkoutMethodLabel(order.method);
        return (
          <View key={order.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.status}>Pago confirmado</Text>
              <Pressable onPress={() => removeOne(order.id)} hitSlop={8}>
                <Text style={styles.remove}>Eliminar</Text>
              </Pressable>
            </View>
            <Text style={styles.shop}>{shop?.name ?? 'Comercio'}</Text>
            {order.items.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              return (
                <View key={`${order.id}-${item.productId}`} style={styles.row}>
                  {product?.image ? (
                    <Image source={{ uri: product.image }} style={styles.thumb} />
                  ) : (
                    <View style={styles.thumb} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={2}>
                      {item.qty}× {item.name}
                    </Text>
                    <Text style={styles.price}>{formatARS(item.unitPrice * item.qty)}</Text>
                  </View>
                </View>
              );
            })}
            <Text style={styles.total}>{formatARS(order.gross)}</Text>
            <Text style={styles.pay}>{pay}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 18 },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  title: { fontFamily: fonts.sansExtra, fontSize: 18, color: colors.ink, flex: 1 },
  clear: { fontFamily: fonts.sansSemi, color: colors.muted, fontSize: 13 },
  card: { ...surface, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  status: { fontFamily: fonts.sansBold, color: colors.success, fontSize: 12, letterSpacing: 0.4 },
  remove: { fontFamily: fonts.sansSemi, color: colors.danger, fontSize: 13 },
  shop: { fontFamily: fonts.sansExtra, color: colors.ink, fontSize: 16, marginTop: 4, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 8, alignItems: 'center' },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.creamDeep,
  },
  name: { fontFamily: fonts.sans, color: colors.ink, fontSize: 14, lineHeight: 19 },
  price: { fontFamily: fonts.sansSemi, color: colors.ink, marginTop: 4 },
  total: { fontFamily: fonts.sansExtra, color: colors.ink, fontSize: 20, marginTop: 8 },
  pay: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4, fontSize: 13 },
});
