import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { CONTACT_EMAIL, openContactEmail } from '@/lib/contact';
import { colors, fonts, radius } from '@/theme/tokens';

export function ContactButton({ style }: { style?: ViewStyle }) {
  return (
    <Pressable onPress={() => openContactEmail()} style={[styles.btn, style]}>
      <FontAwesome name="envelope" size={15} color={colors.white} />
      <View>
        <Text style={styles.label}>Contacto</Text>
        <Text style={styles.mail}>{CONTACT_EMAIL}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  label: { fontFamily: fonts.sansBold, color: colors.white, fontSize: 15 },
  mail: { fontFamily: fonts.sans, color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 2 },
});
