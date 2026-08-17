import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  activityCounts,
  countsLine,
  type ActivityRange,
  type HistoryItem,
} from '@/lib/activity';
import { colors, fonts } from '@/theme/tokens';

const RANGES: { id: ActivityRange; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
];

export function RoutinePulse({
  name,
  items,
  onOpen,
}: {
  name: string;
  items: HistoryItem[];
  onOpen: () => void;
}) {
  const [range, setRange] = useState<ActivityRange>('week');
  const counts = activityCounts(items, range);
  const title = range === 'today' ? `Hoy de ${name}` : range === 'week' ? `La semana de ${name}` : `El mes de ${name}`;

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>{title}</Text>
      <View style={styles.tabs}>
        {RANGES.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => setRange(r.id)}
            style={[styles.tab, range === r.id && styles.tabOn]}
          >
            <Text style={[styles.tabText, range === r.id && styles.tabTextOn]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={onOpen}>
        <Text style={styles.line}>{countsLine(counts)}</Text>
        <Text style={styles.go}>VER ACTIVIDAD →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  kicker: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 17 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tabOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  tabText: { fontFamily: fonts.sansSemi, color: colors.muted, fontSize: 12 },
  tabTextOn: { color: colors.white },
  line: { fontFamily: fonts.sans, color: colors.muted, fontSize: 14, marginTop: 12 },
  go: {
    fontFamily: fonts.sansExtra,
    color: colors.navy,
    fontSize: 12,
    letterSpacing: 1.2,
    marginTop: 12,
  },
});
