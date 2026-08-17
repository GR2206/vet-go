import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { EdgeFadeRow } from '@/components/ui/EdgeFadeRow';
import { Stars } from '@/components/ui/Stars';
import { weekDays } from '@/data/mock';
import { walkers } from '@/data/walkers';
import { formatARS } from '@/lib/format';
import { clockRise } from '@/lib/motion';
import { appointmentAt, buildWalkSlots, hoursLabel } from '@/lib/schedule';
import { resolveWalker, tenureLabel } from '@/lib/walker';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export default function WalkerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pet, user, walkerReviews, walkerProfiles, addWalkerReview, updateWalkerReview, addWalkBooking } =
    useApp();
  const raw = walkers.find((w) => w.id === id);
  const walker = raw ? resolveWalker(raw, walkerProfiles) : undefined;
  const slots = useMemo(() => (walker ? buildWalkSlots(walker.hours) : []), [walker]);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [day, setDay] = useState(weekDays[2].n);
  const [time, setTime] = useState(slots[0] ?? '09:00');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (slots.length && !slots.includes(time)) setTime(slots[0]);
  }, [slots, time]);

  const reviews = useMemo(() => {
    if (!walker) return [];
    const extras = walkerReviews[walker.id] ?? [];
    const extraIds = new Set(extras.map((r) => r.id));
    return [...extras, ...walker.reviewList.filter((r) => !extraIds.has(r.id))];
  }, [walker, walkerReviews]);

  if (!walker) {
    return (
      <View style={styles.missing}>
        <Text style={styles.desc}>No encontramos este paseaperros.</Text>
      </View>
    );
  }

  const count = walker.reviews + (walkerReviews[walker.id]?.length ?? 0);

  const me = user?.name?.split(' ')[0] || 'Vos';

  const publish = () => {
    const text = comment.trim();
    if (text.length < 8) {
      Alert.alert('Evaluación', 'Escribí un comentario concreto, de al menos dos líneas.');
      return;
    }
    if (editId) {
      updateWalkerReview(walker.id, editId, { rating: stars, text, author: me });
      setEditId(null);
    } else {
      addWalkerReview(walker.id, {
        author: me,
        rating: stars,
        text,
      });
    }
    setComment('');
    Alert.alert('Registrada', 'La calificación queda a tu nombre. El paseaperros no puede editarla.');
  };

  const contact = () => {
    Alert.alert(
      'Alerta enviada',
      `Le avisamos a ${walker.name} que querés contactarlo. Así no se pierde el hilo: te va a responder por la app.`,
    );
  };

  const schedule = () => {
    const picked = weekDays.find((w) => w.n === day);
    addWalkBooking({
      id: `walk-${Date.now()}`,
      walkerId: walker.id,
      petId: pet?.id ?? '',
      dateLabel: `${picked?.d} ${picked?.n} ago`,
      time,
      at: appointmentAt(day, time),
      status: 'confirmed',
    });
    setBooking(false);
    Alert.alert(
      'Paseo reservado',
      `${walker.name} · ${picked?.d} ${picked?.n} a las ${time}. Quedó en Pendientes hasta esa hora.`,
      [{ text: 'Ver pendientes', onPress: () => router.replace('/pending' as never) }],
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={styles.hero}>
          <Image source={{ uri: walker.cover }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          <LinearGradient
            colors={['rgba(20,30,46,0.15)', 'rgba(20,30,46,0.2)', colors.cream]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <BackLink overlay style={{ position: 'absolute', top: insets.top + 8, left: 12, zIndex: 2 }} />
          <View style={styles.heroText}>
            <Text style={styles.kicker}>Paseaperros verificado · {walker.neighborhood}</Text>
            <Text style={styles.title}>{walker.name}</Text>
            <View style={styles.rateRow}>
              <Stars value={walker.rating} size={14} />
              <Text style={styles.rateN}>
                {walker.rating.toFixed(1)} · {count} opiniones
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <Image source={{ uri: walker.photo }} style={styles.avatar} />
          <Text style={styles.price}>{formatARS(walker.priceWalk)} / paseo</Text>
          <Text style={styles.tenure}>{tenureLabel(walker)}</Text>
          <Text style={styles.hours}>{hoursLabel(walker.hours)}</Text>
          <Text style={styles.canon}>
            Ficha cargada por el profesional. Las calificaciones las publican y editan únicamente los tutores.
          </Text>
          <Text style={styles.desc}>{walker.description}</Text>
          <View style={styles.tags}>
            {walker.specialties.map((s) => (
              <View key={s} style={styles.tag}>
                <Text style={styles.tagTxt}>{s}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>Evaluaciones de tutores</Text>
          <Text style={styles.hint}>
            El profesional no puede alterarlas. Si la publicaste vos, podés corregirla.
          </Text>
          {reviews.map((r) => {
            const mine = r.author === me;
            return (
              <View key={r.id} style={styles.review}>
                <View style={styles.reviewTop}>
                  <Text style={styles.author}>{r.author}</Text>
                  <Text style={styles.date}>{r.date}</Text>
                </View>
                <Stars value={r.rating} size={12} />
                <Text style={styles.reviewTxt}>{r.text}</Text>
                {mine ? (
                  <Pressable
                    onPress={() => {
                      setEditId(r.id);
                      setStars(r.rating);
                      setComment(r.text);
                    }}
                  >
                    <Text style={styles.editMine}>Editar mi evaluación</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          <View style={styles.compose}>
            <Text style={styles.composeTitle}>{editId ? 'Corregir tu evaluación' : 'Dejar una evaluación'}</Text>
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
              placeholder={`Contá cómo fue el paseo de ${pet?.name ?? 'tu mascota'}…`}
              placeholderTextColor={colors.muted}
              multiline
              style={styles.input}
            />
            <Button compact label={editId ? 'Guardar cambios' : 'Publicar evaluación'} onPress={publish} />
          </View>

          {booking ? (
            <View style={styles.bookBox}>
              <Text style={styles.composeTitle}>Turnos disponibles</Text>
              <Text style={styles.hint}>{hoursLabel(walker.hours)}</Text>
              <EdgeFadeRow
                fadeColor={colors.white}
                style={{ marginHorizontal: -14 }}
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
                    <Text style={[styles.dayD, day === w.n && styles.onTxt]}>{w.d}</Text>
                    <Text style={[styles.dayN, day === w.n && styles.onTxt]}>{w.n}</Text>
                  </Pressable>
                ))}
              </EdgeFadeRow>
              <View style={styles.slots}>
                {slots.map((s, i) => (
                  <Animated.View key={`${day}-${s}`} entering={clockRise.delay(i * 42)}>
                    <Pressable onPress={() => setTime(s)} style={[styles.slot, time === s && styles.dayOn]}>
                      <Text style={[styles.slotTxt, time === s && styles.onTxt]}>{s}</Text>
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
              <Button label="Confirmar paseo" onPress={schedule} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button compact label="Contactar" variant="ghost" onPress={contact} style={{ flex: 1 }} />
        <View style={{ width: 10 }} />
        <Button compact label="Agendar paseo" onPress={() => setBooking(true)} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 320, justifyContent: 'flex-end' },
  heroText: { paddingHorizontal: 18, paddingBottom: 18 },
  kicker: { fontFamily: fonts.sansSemi, color: 'rgba(255,255,255,0.86)', fontSize: 12 },
  title: { fontFamily: fonts.display, color: colors.white, fontSize: 32, marginTop: 4 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  rateN: { fontFamily: fonts.sansSemi, color: colors.white, fontSize: 13 },
  body: { paddingHorizontal: 18, marginTop: -28 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.cream,
    backgroundColor: colors.creamDeep,
    marginBottom: 12,
  },
  price: { fontFamily: fonts.sansExtra, color: colors.navy, fontSize: 22 },
  tenure: { fontFamily: fonts.sansSemi, color: colors.ink, marginTop: 8, fontSize: 13, lineHeight: 18 },
  hours: { fontFamily: fonts.sans, color: colors.teal, marginTop: 4, fontSize: 13 },
  canon: { fontFamily: fonts.sans, color: colors.muted, marginTop: 6, fontSize: 13, lineHeight: 18 },
  desc: { fontFamily: fonts.sans, color: colors.ink, marginTop: 14, lineHeight: 22, fontSize: 15 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tag: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  tagTxt: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 12 },
  section: { fontFamily: fonts.sansExtra, fontSize: 18, color: colors.ink, marginTop: 22, marginBottom: 4 },
  hint: { fontFamily: fonts.sans, color: colors.muted, fontSize: 13, marginBottom: 10 },
  review: { ...surface, padding: 12, marginBottom: 8 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  author: { fontFamily: fonts.sansBold, color: colors.ink },
  date: { fontFamily: fonts.sans, color: colors.muted, fontSize: 12 },
  reviewTxt: { fontFamily: fonts.sans, color: colors.ink, marginTop: 8, lineHeight: 20 },
  editMine: { fontFamily: fonts.sansSemi, color: colors.teal, marginTop: 8, fontSize: 13 },
  compose: { ...surface, padding: 14, marginTop: 8, marginBottom: 16 },
  composeTitle: { fontFamily: fonts.sansBold, color: colors.ink, marginBottom: 8 },
  starPick: { flexDirection: 'row', marginBottom: 8 },
  input: {
    minHeight: 88,
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
  bookBox: { ...surface, padding: 14, marginBottom: 16 },
  days: { gap: 7, paddingHorizontal: 14, paddingBottom: 10 },
  day: {
    width: 44,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  dayOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  dayD: { fontFamily: fonts.sans, color: colors.muted, fontSize: 10 },
  dayN: { fontFamily: fonts.sansExtra, color: colors.ink, fontSize: 15 },
  onTxt: { color: colors.white },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  slot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  slotTxt: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13 },
  bar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.cream,
  },
});
