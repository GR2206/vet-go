import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/store/app-store';
import { colors, fonts, surface } from '@/theme/tokens';

export default function WalkerJoinScreen() {
  const router = useRouter();
  const { user, walkerJoin, submitWalkerJoin } = useApp();
  const [name, setName] = useState(walkerJoin?.name ?? user?.name ?? '');
  const [neighborhood, setNeighborhood] = useState(walkerJoin?.neighborhood ?? user?.zone ?? '');
  const [phone, setPhone] = useState(walkerJoin?.phone ?? user?.phone ?? '');
  const [email, setEmail] = useState(walkerJoin?.email ?? user?.email ?? '');
  const [bio, setBio] = useState(walkerJoin?.bio ?? '');

  const send = () => {
    if (name.trim().length < 3 || neighborhood.trim().length < 3) {
      Alert.alert('Datos', 'Completá nombre y barrio para inscribirte.');
      return;
    }
    if (bio.trim().length < 20) {
      Alert.alert('Presentación', 'Escribí una presentación concreta, de al menos un párrafo.');
      return;
    }
    submitWalkerJoin({
      name: name.trim(),
      neighborhood: neighborhood.trim(),
      phone: phone.trim(),
      email: email.trim(),
      bio: bio.trim(),
    });
    Alert.alert(
      'Solicitud enviada',
      'Revisamos la inscripción. Cuando esté activa, editás ficha y horarios con tu PIN profesional.',
      [
        { text: 'Ir a la ficha', onPress: () => router.replace('/walker-studio' as never) },
        { text: 'Listo' },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <BackLink />
        <Text style={styles.title}>Suscripción paseaperros</Text>
        <Text style={styles.sub}>
          Te inscribís como profesional. Cobrás el paseo; PETS&GO percibe un canon por la ficha. Horarios diurnos, cada 30 min o 1 h.
        </Text>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {walkerJoin ? (
          <Text style={styles.ok}>
            Ya hay una solicitud de {walkerJoin.name}. Podés actualizarla y volver a enviar.
          </Text>
        ) : null}
        <Field label="Nombre profesional" value={name} onChange={setName} />
        <Field label="Barrio de trabajo" value={neighborhood} onChange={setNeighborhood} />
        <Field label="Teléfono" value={phone} onChange={setPhone} keyboard="phone-pad" />
        <Field label="Email" value={email} onChange={setEmail} keyboard="email-address" />
        <Field label="Presentación" value={bio} onChange={setBio} multiline />
        <Button label="Enviar suscripción" onPress={send} />
        <Button
          variant="ghost"
          label="Ya tengo PIN · editar ficha"
          style={{ marginTop: 12 }}
          onPress={() => router.push('/walker-studio' as never)}
        />
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  keyboard?: 'phone-pad' | 'email-address';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.tiny}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboard ?? 'default'}
        autoCapitalize={keyboard === 'email-address' ? 'none' : 'sentences'}
        placeholderTextColor={colors.muted}
        style={[styles.input, multiline && { minHeight: 110, textAlignVertical: 'top' }]}
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
  ok: { fontFamily: fonts.sansSemi, color: colors.teal, marginBottom: 14, lineHeight: 20 },
  tiny: { fontFamily: fonts.sansSemi, color: colors.muted, fontSize: 12, marginBottom: 6 },
  input: {
    ...surface,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    color: colors.ink,
  },
});
