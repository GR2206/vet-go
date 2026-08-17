import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Stars } from '@/components/ui/Stars';
import { formatARS } from '@/lib/format';
import { hoursLabel } from '@/lib/schedule';
import { resolveWalker, tenureLabel } from '@/lib/walker';
import { rankWalkers, walkers } from '@/data/walkers';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export default function WalkersScreen() {
  const router = useRouter();
  const { walkerReviews, walkerProfiles } = useApp();
  const list = rankWalkers(walkers).map((w) => resolveWalker(w, walkerProfiles));

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <BackLink />
        <Text style={styles.title}>Paseaperros</Text>
        <Text style={styles.sub}>
          Profesionales inscriptos. Ellos cargan ficha y horarios; las calificaciones las dejan los tutores.
        </Text>
        <Button
          compact
          label="Soy paseaperros"
          style={{ marginTop: 14 }}
          onPress={() => router.push('/walker-join' as never)}
        />
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {list.map((w) => {
          const extra = walkerReviews[w.id]?.length ?? 0;
          const count = w.reviews + extra;
          return (
            <Pressable key={w.id} style={styles.row} onPress={() => router.push(`/walkers/${w.id}` as never)}>
              <Image source={{ uri: w.photo }} style={styles.thumb} />
              <View style={styles.info}>
                <Text style={styles.name}>{w.name}</Text>
                <Text style={styles.place}>{w.neighborhood} · {hoursLabel(w.hours)}</Text>
                <Text style={styles.tenure} numberOfLines={2}>
                  {tenureLabel(w)}
                </Text>
                <Text style={styles.bio} numberOfLines={2}>
                  {w.bio}
                </Text>
                <View style={styles.rate}>
                  <Stars value={w.rating} />
                  <Text style={styles.rateN}>
                    {w.rating.toFixed(1)} · {count} opiniones
                  </Text>
                </View>
                <Text style={styles.price}>{formatARS(w.priceWalk)} / paseo</Text>
              </View>
            </Pressable>
          );
        })}
        <Pressable style={styles.studio} onPress={() => router.push('/walker-join' as never)}>
          <Text style={styles.studioTitle}>Soy paseaperros</Text>
          <Text style={styles.studioTxt}>
            Inscribite y publicá tu ficha. Si ya tenés PIN, entrá a editar foto, portada y horarios.
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { fontFamily: fonts.sansExtra, fontSize: 22, color: colors.ink },
  back: { marginBottom: 6 },
  backTxt: { fontFamily: fonts.sansSemi, color: colors.teal, fontSize: 14 },
  sub: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4, fontSize: 13, lineHeight: 18 },
  scroll: { padding: 16, paddingBottom: 40 },
  row: {
    ...surface,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
  },
  thumb: {
    width: 92,
    height: 92,
    borderRadius: radius.sm,
    backgroundColor: colors.creamDeep,
  },
  info: { flex: 1 },
  name: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 16 },
  place: { fontFamily: fonts.sans, color: colors.teal, marginTop: 3, fontSize: 13 },
  tenure: { fontFamily: fonts.sansSemi, color: colors.ink, marginTop: 6, fontSize: 12, lineHeight: 16 },
  bio: { fontFamily: fonts.sans, color: colors.muted, marginTop: 6, fontSize: 13, lineHeight: 18 },
  studio: { ...surface, padding: 16, marginTop: 8 },
  studioTitle: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 15 },
  studioTxt: { fontFamily: fonts.sans, color: colors.muted, marginTop: 6, fontSize: 13, lineHeight: 18 },
  rate: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  rateN: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 12 },
  price: { fontFamily: fonts.sansExtra, color: colors.navy, marginTop: 6, fontSize: 16 },
});
