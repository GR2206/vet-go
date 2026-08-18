import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { PasswordField } from '@/components/ui/PasswordField';
import { resetTtlMinutes } from '@/lib/auth';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius } from '@/theme/tokens';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; demoCode?: string }>();
  const { resetPassword, requestPasswordReset } = useApp();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  useEffect(() => {
    if (typeof params.email === 'string') setEmail(params.email);
    if (typeof params.demoCode === 'string') setCode(params.demoCode);
  }, [params.demoCode, params.email]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setInfo('');
    const result = await resetPassword(email, code, password, confirm);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace('/login');
  };

  const resend = async () => {
    if (resendBusy || !email.trim()) return;
    setResendBusy(true);
    setError('');
    setInfo('');
    const result = await requestPasswordReset(email);
    setResendBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCode(result.demoCode);
    setInfo(`Te enviamos un código nuevo. Vence en ${resetTtlMinutes()} minutos.`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <BackLink />
        <Text style={styles.kicker}>PETS&GO</Text>
        <Text style={styles.title}>Nueva contraseña</Text>
        <Text style={styles.sub}>
          Ingresá el código de 6 dígitos y elegí una contraseña nueva. Vence en {resetTtlMinutes()} minutos.
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          placeholder="Código de 6 dígitos"
          keyboardType="number-pad"
          maxLength={6}
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.code]}
        />
        <PasswordField
          value={password}
          onChangeText={setPassword}
          placeholder="Nueva contraseña"
          visible={showPassword}
          onToggleVisible={() => setShowPassword((v) => !v)}
        />
        <PasswordField
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Repetir contraseña"
          visible={showConfirm}
          onToggleVisible={() => setShowConfirm((v) => !v)}
        />
        {typeof params.demoCode === 'string' && params.demoCode ? (
          <Text style={styles.demo}>
            Demo: en producción el código llega por email. Acá lo precargamos para probar.
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}
        <Pressable onPress={resend} disabled={resendBusy} style={styles.resend}>
          <Text style={styles.resendTxt}>{resendBusy ? 'Reenviando…' : 'Reenviar código'}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Button label={busy ? 'Guardando…' : 'Guardar contraseña'} onPress={submit} />
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
  code: { letterSpacing: 6, fontFamily: fonts.sansBold },
  error: { fontFamily: fonts.sansSemi, color: colors.danger, marginBottom: 10 },
  info: { fontFamily: fonts.sans, color: colors.teal, marginBottom: 10, lineHeight: 20 },
  resend: { alignSelf: 'flex-start', paddingVertical: 6 },
  resendTxt: { fontFamily: fonts.sansSemi, color: colors.navy, fontSize: 14 },
  demo: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
    backgroundColor: colors.tealSoft,
    padding: 12,
    borderRadius: radius.md,
  },
});
