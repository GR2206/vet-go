import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { MetalFill } from '@/components/ui/MetalFill';
import { colors, fonts, radius } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'dark' | 'gold';
  compact?: boolean;
  dense?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', compact, dense, style }: Props) {
  const sm = dense ? 'dense' : compact ? 'sm' : 'md';
  if (variant === 'primary' || variant === 'gold' || variant === 'dark') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed, style]}>
        <MetalFill
          style={[styles.metal, sm === 'sm' && styles.metalSm, sm === 'dense' && styles.metalDense]}
          contentStyle={[
            styles.metalInner,
            sm === 'sm' && styles.metalInnerSm,
            sm === 'dense' && styles.metalInnerDense,
          ]}
        >
          <Text
            style={[
              styles.metalText,
              sm === 'sm' && styles.metalTextSm,
              sm === 'dense' && styles.metalTextDense,
            ]}
          >
            {label}
          </Text>
        </MetalFill>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles.ghost,
        sm === 'sm' && styles.ghostSm,
        sm === 'dense' && styles.ghostDense,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.ghostText, sm === 'sm' && styles.ghostTextSm, sm === 'dense' && styles.ghostTextDense]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  metal: { minHeight: 48, borderRadius: radius.pill },
  metalSm: { minHeight: 40 },
  metalDense: { minHeight: 34 },
  metalInner: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  metalInnerSm: { minHeight: 40, paddingHorizontal: 12 },
  metalInnerDense: { minHeight: 34, paddingHorizontal: 10 },
  metalTextSm: { fontSize: 13 },
  metalTextDense: { fontSize: 12 },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  ghostSm: { minHeight: 40, paddingHorizontal: 12 },
  ghostDense: { minHeight: 34, paddingHorizontal: 10 },
  pressed: { opacity: 0.88 },
  metalText: {
    fontFamily: fonts.sansBold,
    color: colors.white,
    fontSize: 15,
  },
  ghostText: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 15 },
  ghostTextSm: { fontSize: 13 },
  ghostTextDense: { fontSize: 12 },
});
