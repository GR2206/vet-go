import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { ContactButton } from '@/components/ui/ContactButton';
import { Button } from '@/components/ui/Button';
import { OrderList } from '@/components/shop/OrderList';
import { places } from '@/data/mock';
import { useLiveProducts } from '@/lib/use-live-products';
import { useApp } from '@/store/app-store';
import { colors, fonts, surface } from '@/theme/tokens';

function ownerPanelHelp() {
  Alert.alert(
    'Panel para comercios',
    'Los dueños de local no entran por la app del tutor. Abrí el panel web en el navegador de tu PC o celular:\n\n· Desarrollo: http://localhost:5173\n· PIN demo Pichichos: 4411 · San Martín: 2580 · Luna: 1919\n\nPETS&GO te asigna el PIN cuando das de alta el local.',
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, pet, vouchers, setVip, shopOrders, favoritePlaceIds, favoriteProductIds } = useApp();
  const products = useLiveProducts();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackLink onPress={() => router.push('/(tabs)/locate')} />
        <Text style={styles.kicker}>Tu club</Text>
        <Text style={styles.title}>{pet?.name ?? 'Tu mascota'}</Text>
        <Text style={styles.meta}>
          {pet?.breed} · {pet?.weightKg} kg · chip {pet?.chip}
        </Text>
        <Text style={styles.meta}>
          {user?.zone}, Rosario · {user?.email}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Puntos</Text>
          <Text style={styles.big}>{user?.points ?? 0}</Text>
          <Text style={styles.meta}>
            {user?.vip ? 'Multiplicador VIP x2 activo' : 'Pasate a VIP y duplicá cada compra'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Membresía</Text>
          <Text style={styles.mid}>{user?.vip ? 'PETS&GO VIP' : 'Plan Free'}</Text>
          <Text style={styles.meta}>
            Envíos bonificados, 1 teleconsulta al mes y puntos x2.
          </Text>
          {!user?.vip ? (
            <Button
              label="Activar VIP · $4.990/mes"
              style={{ marginTop: 14 }}
              onPress={() => {
                setVip(true);
                Alert.alert('VIP activo', 'Ya tenés prioridad de guardia y puntos x2.');
              }}
            />
          ) : (
            <Button label="VIP activo" variant="gold" style={{ marginTop: 14 }} onPress={() => undefined} />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Bonos de planes</Text>
          {vouchers.length === 0 ? (
            <Text style={styles.meta}>Todavía no contrataste un paquete del barrio.</Text>
          ) : (
            vouchers.map((v) => (
              <Text key={v.id} style={styles.voucher}>
                {v.label} · {v.left} disponible{v.left === 1 ? '' : 's'}
              </Text>
            ))
          )}
        </View>

        <OrderList orders={shopOrders} />

        <View style={styles.card}>
          <Text style={styles.label}>Favoritos</Text>
          {favoritePlaceIds.length || favoriteProductIds.length ? (
            <>
              {favoritePlaceIds.map((id) => {
                const shop = places.find((p) => p.id === id);
                if (!shop) return null;
                return (
                  <Pressable key={id} onPress={() => router.push(`/shop/${id}` as never)}>
                    <Text style={styles.voucher}>♥ {shop.name}</Text>
                  </Pressable>
                );
              })}
              {favoriteProductIds.map((id) => {
                const product = products.find((p) => p.id === id);
                if (!product) return null;
                return (
                  <Pressable key={id} onPress={() => router.push(`/shop/${product.shopId}` as never)}>
                    <Text style={styles.voucher}>♡ {product.name}</Text>
                  </Pressable>
                );
              })}
            </>
          ) : (
            <Text style={styles.meta}>Guardá tiendas y productos con el corazón. Quedan en tu cuenta.</Text>
          )}
        </View>

        <Button label="¿Tenés un comercio?" variant="dark" onPress={ownerPanelHelp} />
        <Button
          label="Soy paseaperros"
          variant="ghost"
          style={{ marginTop: 10 }}
          onPress={() => router.push('/walker-join' as never)}
        />
        <ContactButton style={{ marginTop: 16 }} />
        <Text style={styles.footer}>GR Producciones · PETS&GO</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 18, paddingBottom: 110 },
  back: { marginBottom: 12 },
  backText: { fontFamily: fonts.sansSemi, color: colors.teal, fontSize: 14 },
  kicker: { fontFamily: fonts.sansSemi, color: colors.muted, letterSpacing: 1.2 },
  title: { fontFamily: fonts.display, fontSize: 34, color: colors.ink, marginTop: 4 },
  meta: { fontFamily: fonts.sans, color: colors.muted, marginTop: 6, lineHeight: 20 },
  card: {
    ...surface,
    padding: 16,
    marginVertical: 10,
  },
  label: { fontFamily: fonts.sansBold, color: colors.teal, fontSize: 12, letterSpacing: 0.8 },
  big: { fontFamily: fonts.display, fontSize: 40, color: colors.ink, marginTop: 4 },
  mid: { fontFamily: fonts.sansExtra, fontSize: 20, color: colors.ink, marginTop: 4 },
  voucher: { fontFamily: fonts.sansSemi, color: colors.ink, marginTop: 8 },
  footer: {
    textAlign: 'center',
    marginTop: 22,
    fontFamily: fonts.sans,
    color: colors.muted,
    letterSpacing: 0.4,
  },
});
