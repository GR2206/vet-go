import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '@/theme/tokens';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  visible: boolean;
  onToggleVisible: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: StyleProp<ViewStyle>;
};

export function PasswordField({
  value,
  onChangeText,
  placeholder,
  visible,
  onToggleVisible,
  autoCapitalize = 'none',
  style,
}: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={!visible}
        autoCapitalize={autoCapitalize}
        style={styles.input}
      />
      <Pressable
        onPress={onToggleVisible}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.65 }]}
      >
        <FontAwesome name={visible ? 'eye-slash' : 'eye'} size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    minHeight: 56,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    fontFamily: fonts.sansSemi,
    fontSize: 17,
    color: colors.ink,
  },
  toggle: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
