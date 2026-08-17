import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MetalFill } from '@/components/ui/MetalFill';
import { colors, fonts } from '@/theme/tokens';

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        style={({ pressed }) => pressed && styles.pressed}
        accessibilityRole="button"
        accessibilityLabel="Menos"
      >
        <MetalFill style={styles.btn} contentStyle={styles.inner}>
          <Text style={styles.sign}>−</Text>
        </MetalFill>
      </Pressable>
      <Text style={styles.qty}>{value}</Text>
      <Pressable
        onPress={() => onChange(max == null ? value + 1 : Math.min(max, value + 1))}
        style={({ pressed }) => pressed && styles.pressed}
        accessibilityRole="button"
        accessibilityLabel="Más"
      >
        <MetalFill style={styles.btn} contentStyle={styles.inner}>
          <Text style={styles.sign}>+</Text>
        </MetalFill>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  btn: { width: 32, height: 32, borderRadius: 16 },
  inner: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  sign: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.white, lineHeight: 20, marginTop: -1 },
  qty: {
    minWidth: 24,
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    color: colors.ink,
    fontSize: 15,
  },
  pressed: { opacity: 0.88 },
});
