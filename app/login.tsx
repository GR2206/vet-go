import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { login, register, ensureOrigin } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    await ensureOrigin();
    const result =
      mode === 'login'
        ? await login(email, password)
        : await register(name, email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace(result.onboarded ? '/(tabs)' : '/(onboarding)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Text style={styles.kicker}>PETS&GO</Text>
        <Text style={styles.title}>{mode === 'login' ? 'Entrá a tu cuenta' : 'Creá tu cuenta'}</Text>
        <Text style={styles.sub}>
          Compras, favoritos y la ficha de tu mascota quedan asociados a tu usuario.
        </Text>

        {mode === 'register' ? (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        ) : null}
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
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          secureTextEntry
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ flex: 1 }} />
        <Button label={busy ? 'Un segundo…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'} onPress={submit} />
        <Pressable
          onPress={() => {
            setError('');
            setMode(mode === 'login' ? 'register' : 'login');
          }}
          style={styles.switch}
        >
          <Text style={styles.switchTxt}>
            {mode === 'login' ? '¿No tenés cuenta? Creala' : '¿Ya tenés cuenta? Entrá'}
          </Text>
        </Pressable>
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
  switch: { alignItems: 'center', paddingVertical: 16 },
  switchTxt: { fontFamily: fonts.sansSemi, color: colors.navy, fontSize: 14 },
});
