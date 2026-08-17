import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export function BackLink({
  onPress,
  overlay,
  style,
}: {
  onPress?: () => void;
  overlay?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const tint = overlay ? colors.white : colors.teal;
  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      hitSlop={12}
      style={({ pressed }) => [styles.row, overlay && styles.overlay, pressed && { opacity: 0.72 }, style]}
    >
      <FontAwesome name="angle-left" size={20} color={tint} />
      <Text style={[styles.label, { color: tint }]}>Atrás</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 18,
    paddingVertical: 2,
  },
  overlay: {
    marginBottom: 0,
    paddingVertical: 4,
  },
  label: {
    fontFamily: fonts.sansSemi,
    fontSize: 15,
  },
});
