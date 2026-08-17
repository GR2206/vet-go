import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { historyItems } from '@/lib/activity';
import { useApp } from '@/store/app-store';
import { colors, fonts, surface } from '@/theme/tokens';

export default function HistoryScreen() {
  const router = useRouter();
  const { pet, bookings, walkBookings, shopOrders } = useApp();
  const name = pet?.name ?? 'Max';
  const items = historyItems(pet, bookings, walkBookings, shopOrders);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <BackLink />
        <Text style={styles.title}>Actividad de {name}</Text>
        <Text style={styles.sub}>Paseos, baños, controles y compras. Lo que ya pasó.</Text>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.scroll}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Todavía no hay historial</Text>
            <Text style={styles.emptyText}>
              Cuando {name} salga a pasear, se bañe o vaya al vet, va a quedar acá.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <Pressable key={item.id} style={styles.card} onPress={() => router.push(item.to as never)}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.title}</Text>
                <Text style={styles.meta}>{item.text}</Text>
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
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { fontFamily: fonts.sansExtra, fontSize: 22, color: colors.ink },
  sub: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4, fontSize: 13, lineHeight: 18 },
  scroll: { padding: 16, paddingBottom: 40 },
  empty: { ...surface, padding: 20 },
  emptyTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.ink },
  emptyText: { fontFamily: fonts.sans, color: colors.muted, marginTop: 8, lineHeight: 20 },
  card: {
    ...surface,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  emoji: { fontSize: 22 },
  name: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 16 },
  meta: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4 },
});
