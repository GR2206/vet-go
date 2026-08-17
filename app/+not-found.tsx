import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'PETS&GO' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Esa pantalla no existe</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Volver al inicio</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    padding: 20,
  },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  link: { marginTop: 16 },
  linkText: { fontFamily: fonts.sansBold, color: colors.goldDeep },
});
