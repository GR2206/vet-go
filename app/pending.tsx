import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { upcomingPendings } from '@/lib/pending';
import { useApp } from '@/store/app-store';
import { colors, fonts, surface } from '@/theme/tokens';

export default function PendingScreen() {
  const router = useRouter();
  const { bookings, walkBookings } = useApp();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const items = upcomingPendings(bookings, walkBookings);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <BackLink />
        <Text style={styles.title}>Pendientes</Text>
        <Text style={styles.sub}>
          Turnos y paseos futuros. Cuando pasa la hora, dejan de aparecer.
        </Text>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.scroll}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No tenés pendientes por el momento</Text>
            <Text style={styles.emptyText}>
              Cuando reserves un turno o un paseo, lo vas a ver acá hasta que se cumpla el horario.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <Pressable key={item.id} style={styles.card} onPress={() => router.push(item.to as never)}>
              <Text style={styles.kind}>{item.kind === 'walk' ? 'Paseo' : 'Turno'}</Text>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.meta}>{item.detail}</Text>
              <Text style={styles.when}>{item.when}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  back: { fontFamily: fonts.sansSemi, color: colors.teal, marginBottom: 6 },
  title: { fontFamily: fonts.sansExtra, fontSize: 22, color: colors.ink },
  sub: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4, fontSize: 13, lineHeight: 18 },
  scroll: { padding: 16, paddingBottom: 40 },
  empty: { ...surface, padding: 20 },
  emptyTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.ink },
  emptyText: { fontFamily: fonts.sans, color: colors.muted, marginTop: 8, lineHeight: 20 },
  card: { ...surface, padding: 14, marginBottom: 10 },
  kind: { fontFamily: fonts.sansBold, color: colors.teal, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  name: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 16, marginTop: 6 },
  meta: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4 },
  when: { fontFamily: fonts.sansSemi, color: colors.ink, marginTop: 8 },
});
