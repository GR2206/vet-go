import { Pressable, StyleSheet, Text, View } from 'react-native';

import { openNativeMaps } from '@/lib/open-maps';
import { ctaLabel, type Insight } from '@/lib/today';
import { colors, fonts, radius, surface } from '@/theme/tokens';

const LOOK: Record<string, { bg: string; accent: string; emoji: string }> = {
  outing: { bg: '#E7F4EC', accent: '#2F7D55', emoji: '🌳' },
  walk: { bg: '#E7F4EC', accent: '#2F7D55', emoji: '🐾' },
  bath: { bg: '#EEE8F8', accent: '#5E4FA0', emoji: '🛁' },
  deal: { bg: '#FFF1DC', accent: '#C47A1A', emoji: '🎁' },
  vax: { bg: '#FCECEC', accent: '#C45C5C', emoji: '💉' },
  ok: { bg: '#E8F3F8', accent: '#3A6B88', emoji: '💚' },
  wellbeing: { bg: '#E8F3F8', accent: '#3A6B88', emoji: '💚' },
};

function lookOf(item: Insight) {
  if (LOOK[item.id]) return { ...LOOK[item.id], emoji: item.emoji || LOOK[item.id].emoji };
  if (item.id.startsWith('p-')) {
    return {
      bg: '#E6EEF7',
      accent: '#3A5674',
      emoji: item.emoji || (item.to.includes('walk') ? '🐾' : '📅'),
    };
  }
  if (item.to.includes('/shop')) return { bg: '#FFF1DC', accent: '#C47A1A', emoji: item.emoji || '🛒' };
  if (item.to.includes('/walkers')) return { bg: '#E7F4EC', accent: '#2F7D55', emoji: item.emoji || '🐾' };
  if (item.to.includes('/consult')) return { bg: '#E8F3F8', accent: '#3A6B88', emoji: item.emoji || '💚' };
  if (item.id.startsWith('moment')) return { bg: '#FFF8E8', accent: '#B07A18', emoji: item.emoji || '☀️' };
  return { bg: '#F0F3F6', accent: colors.navy, emoji: item.emoji || '✨' };
}

export function TodayFeed({
  name,
  items,
  onOpen,
}: {
  name: string;
  items: Insight[];
  onOpen: (to: string) => void;
}) {
  const go = (item: Insight) => {
    if (item.coordinate) {
      openNativeMaps({
        ...item.coordinate,
        label: item.place?.split(' · ')[0] ?? item.title,
        mode: item.mapsMode ?? 'place',
      }).catch(() => undefined);
      return;
    }
    onOpen(item.to);
  };

  return (
    <View>
      <Text style={styles.section}>Para {name} hoy</Text>
      <View style={styles.card}>
        {items.map((item) => {
          const look = lookOf(item);
          return (
            <Pressable
              key={item.id}
              style={[styles.block, { backgroundColor: look.bg }]}
              onPress={() => go(item)}
            >
              <View style={styles.head}>
                <View style={styles.emojiWrap}>
                  <Text style={styles.emoji}>{look.emoji}</Text>
                </View>
                <Text style={styles.title}>{item.title}</Text>
              </View>
              {item.kicker ? <Text style={[styles.kicker, { color: look.accent }]}>{item.kicker}</Text> : null}
              <Text style={styles.meta}>{item.text}</Text>
              {item.place ? <Text style={styles.place}>{item.place}</Text> : null}
              <Text style={[styles.go, { color: look.accent }]}>{ctaLabel(item, name)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.sansExtra, fontSize: 18, color: colors.ink, marginBottom: 12 },
  card: {
    ...surface,
    padding: 8,
    gap: 8,
  },
  block: {
    borderRadius: radius.md,
    padding: 14,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emojiWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
  title: {
    flex: 1,
    fontFamily: fonts.sansBold,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 21,
  },
  kicker: {
    fontFamily: fonts.sansExtra,
    fontSize: 13,
    marginTop: 8,
    letterSpacing: 0.6,
  },
  meta: { fontFamily: fonts.sans, color: colors.ink, fontSize: 14, marginTop: 6, lineHeight: 20 },
  place: { fontFamily: fonts.sans, color: colors.muted, fontSize: 13, marginTop: 4 },
  go: {
    fontFamily: fonts.sansExtra,
    fontSize: 12,
    letterSpacing: 1.2,
    marginTop: 12,
  },
});
