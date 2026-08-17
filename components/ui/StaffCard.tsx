import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Professional } from '@/data/types';
import { cardShape, colors, fonts, radius, shadow, surface } from '@/theme/tokens';

function Stars({ value, size = 12 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <View style={styles.stars}>
      {Array.from({ length: 5 }).map((_, i) => (
        <FontAwesome
          key={i}
          name="star"
          size={size}
          color={i < full ? colors.gold : '#D1D1D6'}
        />
      ))}
    </View>
  );
}

export function StaffCard({
  pro,
  selected,
  compact,
  slim,
  placeLabel,
  onPress,
}: {
  pro: Professional;
  selected?: boolean;
  compact?: boolean;
  slim?: boolean;
  placeLabel?: string;
  onPress?: () => void;
}) {
  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={[styles.compact, selected && styles.on]}
      >
        <View style={styles.top}>
          <Image source={{ uri: pro.photo }} style={styles.compactPhoto} />
          <View style={styles.meta}>
            <Text style={styles.kicker}>{placeLabel ?? 'Staff clínico'}</Text>
            <Text style={styles.name}>{pro.name}</Text>
            <Text style={styles.role}>{pro.role}</Text>
            <View style={styles.rateRow}>
              <Stars value={pro.rating} />
              <Text style={styles.rate}>
                {pro.rating.toFixed(1)} · {pro.reviews} opiniones
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.quote}>“{pro.quote}”</Text>
        <Text style={styles.reviewer}>— {pro.reviewer}</Text>
        <Text style={styles.foot}>
          {pro.license} · {pro.years} años
        </Text>
      </Pressable>
    );
  }

  if (slim) {
    return (
      <Pressable onPress={onPress} disabled={!onPress} style={[styles.slim, selected && styles.on]}>
        <Image source={{ uri: pro.photo }} style={styles.slimPhoto} />
        <View style={styles.slimBody}>
          {pro.featured ? <Text style={styles.badge}>Destacado</Text> : null}
          <Text style={styles.slimName} numberOfLines={1}>
            {pro.name}
          </Text>
          <Text style={styles.slimRole} numberOfLines={1}>
            {pro.role}
          </Text>
          {placeLabel ? (
            <Text style={styles.slimPlace} numberOfLines={1}>
              {placeLabel}
            </Text>
          ) : null}
          <View style={styles.rateRow}>
            <Stars value={pro.rating} size={11} />
            <Text style={styles.rate}>{pro.rating.toFixed(1)}</Text>
          </View>
          {pro.reviews ? (
            <Text style={styles.slimRec} numberOfLines={2}>
              “{pro.quote}”
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.card}>
      <Image source={{ uri: pro.photo }} style={styles.photo} />
      <View style={styles.body}>
        <Text style={styles.name}>{pro.name}</Text>
        <Text style={styles.role}>{pro.role}</Text>
        {placeLabel ? <Text style={styles.lic}>{placeLabel}</Text> : <Text style={styles.lic}>{pro.license}</Text>}
        <View style={styles.rateRow}>
          <Stars value={pro.rating} size={13} />
          <Text style={styles.rate}>
            {pro.rating.toFixed(1)} · {pro.reviews} opiniones
          </Text>
        </View>
        <Text style={styles.quote} numberOfLines={3}>
          “{pro.quote}”
        </Text>
        <Text style={styles.reviewer}>— {pro.reviewer}</Text>
        <Text style={styles.foot}>{pro.years} años de ejercicio</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 268,
    backgroundColor: colors.white,
    ...cardShape(radius.lg),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.float,
  },
  photo: { width: '100%', height: 188, backgroundColor: colors.creamDeep },
  body: { padding: 14 },
  slim: {
    width: 168,
    backgroundColor: colors.white,
    ...cardShape(radius.lg),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  slimPhoto: { width: '100%', height: 96, backgroundColor: colors.creamDeep },
  slimBody: { padding: 10 },
  badge: {
    fontFamily: fonts.sansSemi,
    color: colors.navy,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  slimName: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 14 },
  slimRole: { fontFamily: fonts.sans, color: colors.teal, fontSize: 12, marginTop: 2 },
  slimPlace: { fontFamily: fonts.sans, color: colors.muted, fontSize: 11, marginTop: 3 },
  slimRec: { fontFamily: fonts.displayItalic, color: colors.ink, fontSize: 11, lineHeight: 15, marginTop: 6 },
  compact: {
    ...surface,
    padding: 14,
    width: '100%',
  },
  on: { borderColor: colors.navy, borderWidth: 1.5 },
  top: { flexDirection: 'row', gap: 12 },
  compactPhoto: {
    width: 76,
    height: 92,
    borderRadius: radius.sm,
    backgroundColor: colors.creamDeep,
    borderWidth: 1,
    borderColor: colors.line,
  },
  meta: { flex: 1, justifyContent: 'center' },
  kicker: {
    fontFamily: fonts.sansSemi,
    color: colors.muted,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  name: { fontFamily: fonts.sansExtra, color: colors.ink, fontSize: 17, marginTop: 2 },
  role: { fontFamily: fonts.sansMedium, color: colors.teal, marginTop: 3, fontSize: 13 },
  lic: { fontFamily: fonts.sans, color: colors.muted, fontSize: 11, marginTop: 4 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  stars: { flexDirection: 'row', gap: 2 },
  rate: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 12 },
  quote: {
    fontFamily: fonts.displayItalic,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 10,
  },
  reviewer: { fontFamily: fonts.sans, color: colors.muted, fontSize: 12, marginTop: 6 },
  foot: { fontFamily: fonts.sansSemi, color: colors.navy, fontSize: 12, marginTop: 8 },
});
