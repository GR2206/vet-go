import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatKm, kindLabel } from '@/lib/format';
import type { Place } from '@/data/types';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export function PlaceCard({
  place,
  onPress,
}: {
  place: Place;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <Image source={{ uri: place.photoUri }} style={styles.cover} contentFit="cover" />
      <View style={styles.body}>
        <View style={styles.top}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{kindLabel(place.kind)}</Text>
          </View>
          <Text style={[styles.status, !place.open && styles.closed]}>
            {place.open ? 'Abierto' : 'Cerrado'}
          </Text>
        </View>
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.meta}>
          {place.neighborhood} · {formatKm(place.distanceKm)} · ★ {place.rating}
        </Text>
        <Text style={styles.blurb}>{place.blurb}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surface,
    overflow: 'hidden',
    marginBottom: 12,
    padding: 0,
  },
  cover: { width: '100%', height: 132, backgroundColor: colors.creamDeep },
  body: { padding: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  badgeText: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 12 },
  status: { fontFamily: fonts.sansSemi, color: colors.teal, fontSize: 12 },
  closed: { color: colors.muted },
  name: { fontFamily: fonts.sansExtra, color: colors.ink, fontSize: 18, marginTop: 10 },
  meta: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4 },
  blurb: { fontFamily: fonts.sans, color: colors.ink, marginTop: 8, lineHeight: 20 },
});
