import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { places, products, professionals, services } from '@/data/mock';
import { formatARS, paymentLabel } from '@/lib/format';
import { PLATFORM_FEE_RATE } from '@/lib/payout';
import { resolvePlace } from '@/lib/place';
import { rankStaff, resolveStaff } from '@/lib/staff';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export default function OwnerScreen() {
  const [pin, setPin] = useState('');
  const {
    placePhotos,
    placeAvatars,
    staffPhotos,
    shopChats,
    servicePrices,
    shopOrders,
    updatePlacePhoto,
    updatePlaceAvatar,
    updateStaffPhoto,
    sendShopMessage,
    updateServicePrice,
    markShopOrderPaidOut,
  } = useApp();
  const raw = places.find((p) => p.ownerPin === pin);
  const shop = raw ? resolvePlace(raw, placePhotos, placeAvatars) : undefined;
  const [reply, setReply] = useState('');
  const catalog = products.filter((p) => p.shopId === shop?.id);
  const sales = shop ? shopOrders.filter((o) => o.shopId === shop.id) : [];
  const pendingSales = sales.filter((o) => o.status === 'payout_pending');
  const pendingNet = pendingSales.reduce((sum, o) => sum + o.net, 0);
  const pendingFee = pendingSales.reduce((sum, o) => sum + o.fee, 0);
  const feePct = Math.round(PLATFORM_FEE_RATE * 100);
  const team = shop
    ? rankStaff(professionals.filter((p) => p.placeId === shop.id)).map((p) => resolveStaff(p, staffPhotos))
    : [];

  const pickPhoto = async (field: 'cover' | 'avatar') => {
    if (!shop) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso', 'Necesitamos la galería para la foto del local.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: field === 'cover' ? [16, 9] : [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      if (field === 'cover') updatePlacePhoto(shop.id, result.assets[0].uri);
      else updatePlaceAvatar(shop.id, result.assets[0].uri);
    }
  };

  const pickStaffPhoto = async (professionalId: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso', 'Necesitamos la galería para la foto del profesional.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      updateStaffPhoto(professionalId, result.assets[0].uri);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
      <BackLink />
      <Text style={styles.title}>Acceso dueño</Text>
      <Text style={styles.sub}>
        Cada comercio tiene su clave. Demo: Pichichos <Text style={styles.em}>4411</Text> · San Martín{' '}
        <Text style={styles.em}>2580</Text> · Luna <Text style={styles.em}>1919</Text>
      </Text>
      <TextInput
        value={pin}
        onChangeText={setPin}
        placeholder="PIN del local"
        keyboardType="number-pad"
        placeholderTextColor={colors.muted}
        style={styles.input}
        maxLength={6}
      />
      {shop ? (
        <View style={styles.card}>
          <Pressable onPress={() => pickPhoto('cover')}>
            <Image source={{ uri: shop.photoUri }} style={styles.cover} contentFit="cover" />
            <Text style={styles.edit}>Cambiar portada</Text>
          </Pressable>
          <Pressable onPress={() => pickPhoto('avatar')} style={styles.avatarRow}>
            <Image source={{ uri: shop.avatarUri }} style={styles.avatar} />
            <Text style={styles.edit}>Cambiar foto de perfil</Text>
          </Pressable>
          <Text style={styles.shop}>{shop.name}</Text>
          <Text style={styles.meta}>
            Portada y foto de perfil se ven en Market, el mapa y la ficha. Las reseñas las dejan los tutores.
          </Text>
          <Text style={styles.meta}>
            Medios que declarás: {shop.paymentMethods.map(paymentLabel).join(' · ')}
          </Text>
          {services.filter((s) => s.placeId === shop.id).length ? (
            <>
              <Text style={styles.teamTitle}>Precios de turnos</Text>
              <Text style={styles.meta}>Esto es lo que ve el tutor al pedir turno.</Text>
              {services
                .filter((s) => s.placeId === shop.id)
                .map((s) => (
                  <View key={s.id} style={styles.priceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prod}>{s.name}</Text>
                      <Text style={styles.staffRole}>{s.minutes} min</Text>
                    </View>
                    <TextInput
                      defaultValue={String(servicePrices[s.id] ?? s.price)}
                      keyboardType="number-pad"
                      placeholderTextColor={colors.muted}
                      style={styles.priceInput}
                      onEndEditing={(e) => {
                        const n = Number(e.nativeEvent.text.replace(/\D/g, ''));
                        if (n > 0) updateServicePrice(s.id, n);
                      }}
                    />
                  </View>
                ))}
            </>
          ) : null}
          <Text style={styles.teamTitle}>Ventas Market</Text>
          {sales.length === 0 ? (
            <Text style={styles.meta}>Todavía no hay pedidos cobrados.</Text>
          ) : (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.prod}>Pendiente a transferir</Text>
                <Text style={styles.price}>{formatARS(pendingNet)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.prod}>Comisión PETS&GO ({feePct}%)</Text>
                <Text style={styles.staffRole}>{formatARS(pendingFee)}</Text>
              </View>
              {sales.map((order) => (
                <View key={order.id} style={styles.sale}>
                  <Text style={styles.prod}>
                    {order.shipping.fullName} ·{' '}
                    {new Date(order.paidAt).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                  <Text style={styles.staffRole}>
                    {order.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}
                  </Text>
                  <Text style={styles.staffRole}>
                    {formatARS(order.gross)} · te corresponde {formatARS(order.net)}
                  </Text>
                  {order.status === 'payout_pending' ? (
                    <Pressable onPress={() => markShopOrderPaidOut(order.id)}>
                      <Text style={styles.edit}>Marcar transferido</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.staffRole}>Transferido</Text>
                  )}
                </View>
              ))}
            </>
          )}
          <Text style={styles.teamTitle}>Equipo de esta sucursal</Text>
          <Text style={styles.meta}>
            Aparecen en Inicio por ranking y campañas. Tocá la foto para cambiarla: se ve en la app del tutor.
          </Text>
          {team.length === 0 ? (
            <Text style={styles.meta}>Todavía no hay profesionales asociados a este local.</Text>
          ) : (
            team.map((pro) => (
              <Pressable key={pro.id} style={styles.staffRow} onPress={() => pickStaffPhoto(pro.id)}>
                <Image source={{ uri: pro.photo }} style={styles.staffPhoto} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.prod}>{pro.name}</Text>
                  <Text style={styles.staffRole}>
                    {pro.role}
                    {pro.featured ? ' · Destacado' : ''} · ranking {pro.rank}
                  </Text>
                  <Text style={styles.edit}>Cambiar foto</Text>
                </View>
              </Pressable>
            ))
          )}
          <Text style={styles.teamTitle}>Chat con tutores</Text>
          <Text style={styles.meta}>
            Lo que escribas acá lo ve el cliente en Contactar. Respondé como el local.
          </Text>
          {(shopChats[shop.id] ?? []).map((m) => (
            <View key={m.id} style={styles.msgRow}>
              <Text style={styles.msgFrom}>{m.from === 'shop' ? 'Local' : m.author}</Text>
              <Text style={styles.msgTxt}>{m.text}</Text>
            </View>
          ))}
          <TextInput
            value={reply}
            onChangeText={setReply}
            placeholder="Responder al cliente…"
            placeholderTextColor={colors.muted}
            style={styles.reply}
            multiline
          />
          <Button
            label="Enviar respuesta"
            compact
            onPress={() => {
              const body = reply.trim();
              if (body.length < 2) return;
              sendShopMessage(shop.id, { from: 'shop', author: shop.name, text: body });
              setReply('');
            }}
          />
          {catalog.map((p) => (
            <View key={p.id} style={styles.row}>
              <Text style={styles.prod}>{p.name}</Text>
              <Text style={styles.price}>{formatARS(p.price)}</Text>
            </View>
          ))}
          <Button
            label="Marcar un producto agotado"
            variant="ghost"
            style={{ marginTop: 12 }}
            onPress={() => Alert.alert('Listo', 'En la app del tutor ese ítem queda pausado.')}
          />
        </View>
      ) : pin.length >= 4 ? (
        <Text style={styles.meta}>PIN no coincide con ningún local asociado.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 18, paddingBottom: 40 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  sub: { fontFamily: fonts.sans, color: colors.muted, marginVertical: 10, lineHeight: 20 },
  em: { fontFamily: fonts.sansBold, color: colors.ink },
  input: {
    ...surface,
    minHeight: 54,
    paddingHorizontal: 16,
    fontFamily: fonts.sansBold,
    fontSize: 20,
    letterSpacing: 4,
    color: colors.ink,
    marginBottom: 16,
  },
  card: {
    ...surface,
    padding: 16,
  },
  cover: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: colors.creamDeep,
    marginBottom: 8,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  avatar: { width: 64, height: 64, borderRadius: 14, backgroundColor: colors.creamDeep },
  msgRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  msgFrom: { fontFamily: fonts.sansBold, color: colors.teal, fontSize: 12 },
  msgTxt: { fontFamily: fonts.sans, color: colors.ink, marginTop: 4, lineHeight: 20 },
  reply: {
    minHeight: 72,
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
  edit: { fontFamily: fonts.sansSemi, color: colors.teal, marginBottom: 12 },
  shop: { fontFamily: fonts.sansExtra, fontSize: 18, color: colors.ink },
  meta: { fontFamily: fonts.sans, color: colors.muted, marginTop: 6, marginBottom: 10 },
  teamTitle: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 16, marginTop: 8 },
  staffRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    alignItems: 'center',
  },
  staffPhoto: {
    width: 56,
    height: 68,
    borderRadius: radius.sm,
    backgroundColor: colors.creamDeep,
  },
  staffRole: { fontFamily: fonts.sans, color: colors.muted, marginTop: 3, fontSize: 13 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  priceInput: {
    width: 110,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    fontFamily: fonts.sansBold,
    color: colors.ink,
    textAlign: 'right',
    backgroundColor: colors.white,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  prod: { fontFamily: fonts.sans, color: colors.ink, flex: 1, paddingRight: 8 },
  price: { fontFamily: fonts.sansBold, color: colors.teal },
  sale: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
