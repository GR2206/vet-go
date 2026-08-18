import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { canCancelOrder, cancelSecondsLeft } from '@/lib/orders';
import { upcomingPendings } from '@/lib/pending';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export default function PendingScreen() {
  const router = useRouter();
  const {
    bookings,
    walkBookings,
    shopOrders,
    markOrderReceived,
    markOrderRated,
    dismissPendingOrder,
    cancelOrder,
    addPlaceReview,
    user,
  } = useApp();
  const [, tick] = useState(0);
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const me = user?.name?.split(' ')[0] || 'Vos';
  const hasCancellable = shopOrders.some((o) => canCancelOrder(o));
  useEffect(() => {
    const ms = hasCancellable ? 1000 : 30_000;
    const id = setInterval(() => tick((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [hasCancellable]);
  const items = upcomingPendings(bookings, walkBookings, shopOrders);

  const openRate = (orderId: string) => {
    setRatingOrderId(orderId);
    setStars(5);
    setComment('');
  };

  const submitRate = (shopId: string, orderId: string) => {
    addPlaceReview(shopId, {
      author: me,
      rating: stars,
      text: comment.trim(),
    });
    markOrderRated(orderId, { rating: stars, text: comment.trim() });
    setRatingOrderId(null);
    setComment('');
    setStars(5);
  };

  const confirmCancel = (orderId: string) => {
    Alert.alert(
      'Cancelar pedido',
      '¿Seguro? Solo podés cancelar en los primeros 2 minutos y antes de que el local confirme.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => cancelOrder(orderId) },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={styles.header}>
        <BackLink />
        <Text style={styles.title}>Pendientes</Text>
        <Text style={styles.sub}>
          Turnos, paseos y pedidos del Market. Los pedidos confirmados te avisan hasta que los recibas.
        </Text>
      </SafeAreaView>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No tenés pendientes por el momento</Text>
            <Text style={styles.emptyText}>
              Cuando reserves un turno, un paseo o compres en el Market, lo vas a ver acá.
            </Text>
          </View>
        ) : (
          items.map((item) =>
            item.kind === 'order' && item.order ? (
              <View
                key={item.id}
                style={[
                  styles.card,
                  (item.order.deliveryStatus === 'confirmed' || item.order.pendingOpen) &&
                    styles.cardActive,
                ]}
              >
                {item.order.deliveryStatus === 'confirmed' && !item.order.receivedAt ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Activo</Text>
                  </View>
                ) : item.order.receivedAt ? (
                  <View style={[styles.badge, styles.badgeDone]}>
                    <Text style={[styles.badgeText, styles.badgeTextLight]}>
                      {item.order.ratedAt ? 'Recibido y calificado' : 'Recibido'}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.kind}>Pedido Market</Text>
                <Text style={styles.name}>{item.title}</Text>
                <Text style={styles.meta}>{item.detail}</Text>
                <Text style={styles.when}>{item.when}</Text>
                {canCancelOrder(item.order) ? (
                  <View style={styles.actions}>
                    <Pressable style={styles.cancelBtn} onPress={() => confirmCancel(item.order!.id)}>
                      <Text style={styles.cancelText}>
                        Cancelar pedido ({cancelSecondsLeft(item.order!)}s)
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
                {item.order.deliveryStatus !== 'awaiting_shop' ? (
                  <View style={styles.actions}>
                    {!item.order.receivedAt ? (
                      <Button
                        label="Recibí el producto"
                        onPress={() => markOrderReceived(item.order!.id)}
                        style={styles.actionBtn}
                      />
                    ) : null}
                    {!item.order.ratedAt ? (
                      ratingOrderId === item.order.id ? (
                        <View style={styles.rateBox}>
                          <Text style={styles.rateLabel}>¿Cómo fue tu experiencia?</Text>
                          <View style={styles.starPick}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Pressable key={n} onPress={() => setStars(n)} style={styles.starHit}>
                                <Text style={styles.star}>{n <= stars ? '⭐' : '☆'}</Text>
                              </Pressable>
                            ))}
                          </View>
                          <TextInput
                            value={comment}
                            onChangeText={setComment}
                            placeholder="Comentario (opcional)"
                            placeholderTextColor={colors.muted}
                            multiline
                            style={styles.rateInput}
                          />
                          <Button
                            label="Enviar calificación"
                            onPress={() => submitRate(item.order!.shopId, item.order!.id)}
                            style={styles.actionBtn}
                          />
                          <Pressable style={styles.rateBtn} onPress={() => setRatingOrderId(null)}>
                            <Text style={styles.rateText}>Cancelar</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable style={styles.rateBtn} onPress={() => openRate(item.order!.id)}>
                          <Text style={styles.rateText}>Calificar tienda</Text>
                        </Pressable>
                      )
                    ) : item.order.tutorRating ? (
                      <View style={styles.rateBox}>
                        <Text style={styles.rateLabel}>
                          Tu calificación · {'★'.repeat(item.order.tutorRating.rating)}
                          {'☆'.repeat(Math.max(0, 5 - item.order.tutorRating.rating))}
                        </Text>
                        {item.order.tutorRating.text ? (
                          <Text style={styles.doneText}>“{item.order.tutorRating.text}”</Text>
                        ) : (
                          <Text style={styles.doneText}>Sin comentario</Text>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.doneText}>Tienda calificada</Text>
                    )}
                    {item.order.buyerRating ? (
                      <View style={styles.rateBox}>
                        <Text style={styles.rateLabel}>
                          El local te calificó · {'★'.repeat(item.order.buyerRating.rating)}
                          {'☆'.repeat(Math.max(0, 5 - item.order.buyerRating.rating))}
                        </Text>
                        {item.order.buyerRating.text ? (
                          <Text style={styles.doneText}>“{item.order.buyerRating.text}”</Text>
                        ) : null}
                      </View>
                    ) : null}
                    <Button
                      label="Cerrar"
                      variant="ghost"
                      onPress={() => dismissPendingOrder(item.order!.id)}
                      style={styles.actionBtn}
                    />
                  </View>
                ) : null}
              </View>
            ) : (
              <Pressable key={item.id} style={styles.card} onPress={() => router.push(item.to as never)}>
                <Text style={styles.kind}>{item.kind === 'walk' ? 'Paseo' : 'Turno'}</Text>
                <Text style={styles.name}>{item.title}</Text>
                <Text style={styles.meta}>{item.detail}</Text>
                <Text style={styles.when}>{item.when}</Text>
              </Pressable>
            ),
          )
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { fontFamily: fonts.sansExtra, fontSize: 22, color: colors.ink },
  sub: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4, fontSize: 13, lineHeight: 18 },
  scroll: { padding: 16, paddingBottom: 40 },
  empty: { ...surface, padding: 20 },
  emptyTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.ink },
  emptyText: { fontFamily: fonts.sans, color: colors.muted, marginTop: 8, lineHeight: 20 },
  card: { ...surface, padding: 14, marginBottom: 10 },
  cardActive: { borderWidth: 2, borderColor: colors.gold },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginBottom: 8,
  },
  badgeText: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.navy, letterSpacing: 0.6 },
  badgeDone: { backgroundColor: colors.teal },
  badgeTextLight: { color: colors.white },
  kind: { fontFamily: fonts.sansBold, color: colors.teal, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  name: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 16, marginTop: 6 },
  meta: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4 },
  when: { fontFamily: fonts.sansSemi, color: colors.ink, marginTop: 8 },
  actions: { marginTop: 12, gap: 8 },
  actionBtn: { alignSelf: 'stretch' },
  cancelBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: { fontFamily: fonts.sansSemi, color: '#B42318', fontSize: 14 },
  rateBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rateText: { fontFamily: fonts.sansSemi, color: colors.teal, fontSize: 14 },
  doneText: { fontFamily: fonts.sansSemi, color: colors.muted, fontSize: 13, textAlign: 'center' },
  rateBox: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
    gap: 8,
    backgroundColor: colors.cream,
  },
  rateLabel: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 14, textAlign: 'center' },
  starPick: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  starHit: { padding: 4 },
  star: { fontSize: 22 },
  rateInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.white,
    textAlignVertical: 'top',
  },
});
