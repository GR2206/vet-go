import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { places, professionals, services } from '@/data/mock';
import { useApp } from '@/store/app-store';
import { colors, fonts, surface } from '@/theme/tokens';

export default function BookingsScreen() {
  const router = useRouter();
  const { bookings } = useApp();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Tus turnos</Text>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {bookings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Todavía no hay citas</Text>
            <Text style={styles.emptyText}>
              Reservá peluquería o veterinaria en vivo, al estilo AgendaPro.
            </Text>
            <Button label="Reservar en San Martín" onPress={() => router.push('/booking/san-martin')} />
          </View>
        ) : (
          bookings.map((b) => {
            const place = places.find((p) => p.id === b.placeId);
            const service = services.find((s) => s.id === b.serviceId);
            const pro = professionals.find((p) => p.id === b.professionalId);
            return (
              <View key={b.id} style={styles.card}>
                <Text style={styles.status}>{b.status === 'confirmed' ? 'Confirmado' : b.status}</Text>
                <Text style={styles.name}>{service?.name}</Text>
                <Text style={styles.meta}>
                  {place?.name} · {pro?.name}
                </Text>
                <Text style={styles.when}>
                  {b.dateLabel} · {b.time}
                </Text>
                {b.usedVoucher ? <Text style={styles.voucher}>Canjeado con bono del plan</Text> : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 18 },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, marginBottom: 8 },
  scroll: { paddingBottom: 100 },
  empty: {
    ...surface,
    padding: 22,
    marginTop: 12,
  },
  emptyTitle: { fontFamily: fonts.sansExtra, fontSize: 18, color: colors.ink },
  emptyText: { fontFamily: fonts.sans, color: colors.muted, marginVertical: 10, lineHeight: 20 },
  card: {
    ...surface,
    padding: 16,
    marginBottom: 12,
  },
  status: { fontFamily: fonts.sansBold, color: colors.teal, fontSize: 12, letterSpacing: 0.6 },
  name: { fontFamily: fonts.sansExtra, color: colors.ink, fontSize: 18, marginTop: 6 },
  meta: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4 },
  when: { fontFamily: fonts.sansSemi, color: colors.ink, marginTop: 8 },
  voucher: { fontFamily: fonts.sans, color: colors.goldDeep, marginTop: 6 },
});
