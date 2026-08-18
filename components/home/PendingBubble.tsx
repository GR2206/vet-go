import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { upcomingPendings } from '@/lib/pending';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export function PendingBubble() {
  const router = useRouter();
  const { bookings, walkBookings, shopOrders } = useApp();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const items = upcomingPendings(bookings, walkBookings, shopOrders);
  const next = items[0];

  return (
    <Pressable style={styles.card} onPress={() => router.push('/pending' as never)}>
      <View style={styles.top}>
        <Text style={styles.kicker}>Pendientes</Text>
        {items.length ? (
          <View style={styles.globo}>
            <Text style={styles.globoN}>{items.length}</Text>
          </View>
        ) : null}
      </View>
      {next ? (
        <>
          <Text style={styles.title} numberOfLines={1}>
            {next.title}
          </Text>
          <Text style={styles.when}>{next.when}</Text>
        </>
      ) : (
        <Text style={styles.empty}>No tenés pendientes por el momento.</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surface,
    padding: 14,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: {
    fontFamily: fonts.sansBold,
    color: colors.teal,
    letterSpacing: 1,
    fontSize: 12,
  },
  globo: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globoN: { fontFamily: fonts.sansBold, color: colors.white, fontSize: 12 },
  title: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 15, marginTop: 8 },
  when: { fontFamily: fonts.sans, color: colors.muted, marginTop: 3, fontSize: 13 },
  empty: { fontFamily: fonts.sans, color: colors.muted, marginTop: 8, fontSize: 14, lineHeight: 20 },
});
