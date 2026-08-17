import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { ContactButton } from '@/components/ui/ContactButton';
import { zones } from '@/data/mock';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export default function AccountScreen() {
  const router = useRouter();
  const { user, updateUser, setVip, logout } = useApp();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [zone, setZone] = useState(user?.zone ?? zones[0]);

  const save = () => {
    updateUser({
      name: name.trim() || user?.name,
      email: email.trim() || user?.email,
      phone: phone.trim(),
      zone,
    });
    Alert.alert('Datos guardados', 'El titular de la cuenta quedó actualizado.');
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <BackLink />
        <Text style={styles.title}>Perfil y suscripción</Text>
        <Text style={styles.sub}>Datos del titular de PETS&GO y el plan de la app.</Text>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.block}>Titular</Text>
        <Field label="Nombre y apellido" value={name} onChange={setName} />
        <Field label="Email" value={email} onChange={setEmail} keyboard="email-address" />
        <Field label="Teléfono" value={phone} onChange={setPhone} keyboard="phone-pad" />
        <Text style={styles.tiny}>Barrio</Text>
        <View style={styles.zones}>
          {zones.map((z) => (
            <Pressable key={z} onPress={() => setZone(z)} style={[styles.pill, zone === z && styles.pillOn]}>
              <Text style={[styles.pillTxt, zone === z && styles.pillTxtOn]}>{z}</Text>
            </Pressable>
          ))}
        </View>
        <Button label="Guardar datos" onPress={save} />

        <Text style={[styles.block, { marginTop: 28 }]}>Suscripción</Text>
        <View style={styles.card}>
          <Text style={styles.plan}>{user?.vip ? 'PETS&GO VIP' : 'Plan Free'}</Text>
          <Text style={styles.meta}>
            {user?.vip
              ? 'Envíos bonificados, teleconsulta mensual y puntos x2.'
              : 'Podés pasar a VIP cuando quieras. Se factura por mes.'}
          </Text>
          {!user?.vip ? (
            <Button
              compact
              label="Activar VIP · $4.990/mes"
              style={{ marginTop: 14 }}
              onPress={() => {
                setVip(true);
                Alert.alert('VIP activo', 'Ya tenés prioridad de guardia y puntos x2.');
              }}
            />
          ) : (
            <Button
              compact
              variant="ghost"
              label="Volver al plan Free"
              style={{ marginTop: 14 }}
              onPress={() => {
                setVip(false);
                Alert.alert('Plan Free', 'La suscripción VIP quedó pausada.');
              }}
            />
          )}
        </View>

        <Button
          variant="ghost"
          label="Soy paseaperros"
          style={{ marginTop: 16 }}
          onPress={() => router.push('/walker-join' as never)}
        />
        <Button
          variant="ghost"
          label="Modo dueño (comercio)"
          style={{ marginTop: 10 }}
          onPress={() => router.push('/owner')}
        />
        <Button
          variant="ghost"
          label="Cerrar sesión"
          style={{ marginTop: 10 }}
          onPress={() => {
            Alert.alert('Cerrar sesión', 'Tus compras y favoritos quedan guardados en esta cuenta.', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Salir',
                onPress: async () => {
                  await logout();
                  router.replace('/login' as never);
                },
              },
            ]);
          }}
        />
        <ContactButton style={{ marginTop: 18 }} />
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: 'email-address' | 'phone-pad';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.tiny}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard ?? 'default'}
        autoCapitalize={keyboard === 'email-address' ? 'none' : 'words'}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { fontFamily: fonts.sansExtra, fontSize: 22, color: colors.ink },
  sub: { fontFamily: fonts.sans, color: colors.muted, marginTop: 6, fontSize: 13, lineHeight: 18 },
  scroll: { padding: 16, paddingBottom: 40 },
  block: { fontFamily: fonts.sansExtra, fontSize: 16, color: colors.ink, marginBottom: 12 },
  tiny: { fontFamily: fonts.sansSemi, color: colors.muted, fontSize: 12, marginBottom: 6 },
  input: {
    ...surface,
    minHeight: 48,
    paddingHorizontal: 14,
    fontFamily: fonts.sans,
    color: colors.ink,
  },
  zones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  pillOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  pillTxt: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13 },
  pillTxtOn: { color: colors.white },
  card: { ...surface, padding: 16, marginBottom: 8 },
  plan: { fontFamily: fonts.sansExtra, fontSize: 18, color: colors.ink },
  meta: { fontFamily: fonts.sans, color: colors.muted, marginTop: 6, lineHeight: 20 },
});
