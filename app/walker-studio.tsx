import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackLink } from '@/components/ui/BackLink';
import { walkers } from '@/data/walkers';
import type { WalkerHours } from '@/data/types';
import { WORK_ENDS, WORK_STARTS, hoursLabel } from '@/lib/schedule';
import { resolveWalker, tenureLabel } from '@/lib/walker';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export default function WalkerStudioScreen() {
  const [pin, setPin] = useState('');
  const { walkerProfiles, updateWalkerProfile } = useApp();
  const raw = walkers.find((w) => w.ownerPin === pin);
  const walker = raw ? resolveWalker(raw, walkerProfiles) : undefined;

  const save = (patch: Parameters<typeof updateWalkerProfile>[1]) => {
    if (!walker) return;
    updateWalkerProfile(walker.id, patch);
  };

  const pick = async (field: 'photo' | 'cover') => {
    if (!walker) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso', 'Necesitamos la galería para actualizar la ficha.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: field === 'cover' ? [16, 9] : [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) save({ [field]: result.assets[0].uri });
  };

  const hours: WalkerHours = walker?.hours ?? { start: '08:00', end: '18:00', step: 60 };

  const tags = useMemo(() => (walker?.specialties ?? []).join(', '), [walker]);

  return (
    <View style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <BackLink />
        <Text style={styles.title}>Ficha del paseaperros</Text>
        <Text style={styles.sub}>
          Editás foto, portada, datos y horarios laborales. Las reseñas las cargan los tutores: no se pueden modificar desde acá. Demo: Nicolás <Text style={styles.em}>3301</Text> · Sol{' '}
          <Text style={styles.em}>4488</Text>
        </Text>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.scroll}>
      <TextInput
        value={pin}
        onChangeText={setPin}
        placeholder="PIN profesional"
        keyboardType="number-pad"
        placeholderTextColor={colors.muted}
        style={styles.pin}
        maxLength={6}
      />
      {walker ? (
        <View style={styles.card}>
          <Text style={styles.note}>
            Calificaciones y opiniones son de los usuarios. Tu antigüedad en PETS&GO se calcula sola y suma confianza.
          </Text>
          <Text style={styles.hoursNow}>{tenureLabel(walker)}</Text>
          <Pressable onPress={() => pick('cover')}>
            <Image source={{ uri: walker.cover }} style={styles.cover} contentFit="cover" />
            <Text style={styles.link}>Cambiar portada</Text>
          </Pressable>
          <Pressable onPress={() => pick('photo')} style={styles.photoRow}>
            <Image source={{ uri: walker.photo }} style={styles.avatar} />
            <Text style={styles.link}>Cambiar foto de perfil</Text>
          </Pressable>
          <Field label="Nombre" value={walker.name} onChange={(v) => save({ name: v })} />
          <Field label="Barrio" value={walker.neighborhood} onChange={(v) => save({ neighborhood: v })} />
          <Field label="Resumen" value={walker.bio} onChange={(v) => save({ bio: v })} />
          <Field label="Descripción" value={walker.description} onChange={(v) => save({ description: v })} multiline />
          <Field
            label="Especialidades (separadas por coma)"
            value={tags}
            onChange={(v) =>
              save({
                specialties: v
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <Field
            label="Tarifa por paseo (ARS)"
            value={String(walker.priceWalk)}
            keyboard="number-pad"
            onChange={(v) => save({ priceWalk: Number(v.replace(/\D/g, '')) || walker.priceWalk })}
          />

          <Text style={styles.block}>Horario laboral</Text>
          <Text style={styles.meta}>
            Solo franja diurna. Intervalo de 30 minutos o 1 hora. Sin turnos abiertos ni nocturnos.
          </Text>
          <Text style={styles.hoursNow}>{hoursLabel(hours)}</Text>
          <Text style={styles.tiny}>Inicio</Text>
          <View style={styles.pills}>
            {WORK_STARTS.map((t) => (
              <Pressable
                key={t}
                onPress={() => save({ hours: { ...hours, start: t } })}
                style={[styles.pill, hours.start === t && styles.pillOn]}
              >
                <Text style={[styles.pillTxt, hours.start === t && styles.pillTxtOn]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.tiny}>Cierre</Text>
          <View style={styles.pills}>
            {WORK_ENDS.map((t) => (
              <Pressable
                key={t}
                onPress={() => save({ hours: { ...hours, end: t } })}
                style={[styles.pill, hours.end === t && styles.pillOn]}
              >
                <Text style={[styles.pillTxt, hours.end === t && styles.pillTxtOn]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.tiny}>Intervalo</Text>
          <View style={styles.pills}>
            {([30, 60] as const).map((step) => (
              <Pressable
                key={step}
                onPress={() => save({ hours: { ...hours, step } })}
                style={[styles.pill, hours.step === step && styles.pillOn]}
              >
                <Text style={[styles.pillTxt, hours.step === step && styles.pillTxtOn]}>
                  {step === 30 ? 'Cada 30 min' : 'Cada 1 h'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : pin.length >= 4 ? (
        <Text style={styles.meta}>PIN no coincide con ningún paseaperros inscripto.</Text>
      ) : null}
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
  keyboard?: 'number-pad';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.tiny}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboard ?? 'default'}
        placeholderTextColor={colors.muted}
        style={[styles.input, multiline && { minHeight: 90, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 18, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  back: { fontFamily: fonts.sansSemi, color: colors.teal, marginBottom: 6 },
  scroll: { padding: 18, paddingBottom: 40 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  sub: { fontFamily: fonts.sans, color: colors.muted, marginVertical: 10, lineHeight: 20 },
  em: { fontFamily: fonts.sansBold, color: colors.ink },
  pin: {
    ...surface,
    minHeight: 54,
    paddingHorizontal: 16,
    fontFamily: fonts.sansBold,
    fontSize: 20,
    letterSpacing: 4,
    color: colors.ink,
    marginBottom: 16,
  },
  card: { ...surface, padding: 16 },
  note: { fontFamily: fonts.sans, color: colors.muted, marginBottom: 12, lineHeight: 20 },
  cover: { width: '100%', height: 140, borderRadius: radius.md, backgroundColor: colors.creamDeep },
  link: { fontFamily: fonts.sansSemi, color: colors.teal, marginTop: 6, marginBottom: 12 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.creamDeep },
  block: { fontFamily: fonts.sansBold, color: colors.ink, marginTop: 8 },
  meta: { fontFamily: fonts.sans, color: colors.muted, marginTop: 6, marginBottom: 10, lineHeight: 20 },
  hoursNow: { fontFamily: fonts.sansSemi, color: colors.navy, marginBottom: 10 },
  tiny: { fontFamily: fonts.sansSemi, color: colors.muted, fontSize: 12, marginBottom: 6 },
  input: {
    ...surface,
    minHeight: 46,
    paddingHorizontal: 12,
    fontFamily: fonts.sans,
    color: colors.ink,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
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
});
