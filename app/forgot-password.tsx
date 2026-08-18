import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset } = useApp();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await requestPasswordReset(email);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push({
      pathname: '/reset-password',
      params: { email: result.email, demoCode: result.demoCode },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <BackLink />
        <Text style={styles.kicker}>PETS&GO</Text>
        <Text style={styles.title}>Recuperar contraseña</Text>
        <Text style={styles.sub}>
          Te enviamos un código de 6 dígitos al email de tu cuenta. Revisá bandeja y spam.
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email de tu cuenta"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ flex: 1 }} />
        <Button label={busy ? 'Enviando…' : 'Enviar código'} onPress={submit} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream, padding: 22 },
  kicker: { fontFamily: fonts.display, color: colors.navy, fontSize: 18, letterSpacing: 1 },
  title: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 38,
    color: colors.ink,
    marginTop: 18,
  },
  sub: { fontFamily: fonts.sans, color: colors.muted, fontSize: 15, lineHeight: 21, marginTop: 8, marginBottom: 22 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    minHeight: 56,
    fontFamily: fonts.sansSemi,
    fontSize: 17,
    color: colors.ink,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  error: { fontFamily: fonts.sansSemi, color: colors.danger, marginBottom: 10 },
});
