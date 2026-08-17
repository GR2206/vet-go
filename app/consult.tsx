import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { StaffCard } from '@/components/ui/StaffCard';
import { professionals } from '@/data/mock';
import { resolveStaff } from '@/lib/staff';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

const questions = [
  '¿Come y toma agua con normalidad?',
  '¿Hay vómitos, diarrea o decaimiento?',
  '¿Es una urgencia de los últimos 60 minutos?',
];

export default function ConsultScreen() {
  const { pet, staffPhotos } = useApp();
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [note, setNote] = useState('');
  const lucia = resolveStaff(professionals.find((p) => p.id === 'lucia') ?? professionals[0], staffPhotos);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.body}>
      <View style={styles.petCard}>
        <Text style={styles.kicker}>Paciente</Text>
        <Text style={styles.heroName}>{pet?.name ?? 'Tu mascota'}</Text>
        <Text style={styles.heroMeta}>
          {pet?.sex === 'hembra' ? 'Hembra' : 'Macho'} · {pet?.breed} · {pet?.ageYears} años · {pet?.weightKg} kg
        </Text>
      </View>

      <Text style={styles.section}>Veterinaria de guardia</Text>
      <StaffCard pro={lucia} compact placeLabel="Guardia Vet Fisherton" />

      <Text style={styles.title}>Triage</Text>
      <Text style={styles.sub}>Tres preguntas y te conectamos con {lucia.name}.</Text>
      {questions.map((q, i) => (
        <View key={q} style={styles.block}>
          <Text style={styles.q}>{q}</Text>
          <View style={styles.row}>
            {['Sí', 'No'].map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setAnswers((prev) => prev.map((v, idx) => (idx === i ? opt : v)))}
                style={[styles.opt, answers[i] === opt && styles.optOn]}
              >
                <Text style={[styles.optText, answers[i] === opt && styles.optTextOn]}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Contale al vet qué ves (opcional)"
        placeholderTextColor={colors.muted}
        style={styles.input}
        multiline
      />
      <Pressable
        style={styles.call}
        onPress={() => {
          if (answers.some((a) => !a)) {
            Alert.alert('Falta el triage', 'Respondé las tres preguntas para priorizar.');
            return;
          }
          Alert.alert(
            'Guardia en línea',
            'Derivamos a Guardia Vet Fisherton. PETS&GO retiene el canon y liquida a la clínica.',
          );
        }}
      >
        <FontAwesome name="phone" size={16} color={colors.white} />
        <Text style={styles.callText}>Llamar a guardia veterinaria</Text>
        <FontAwesome name="angle-right" size={18} color={colors.white} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  body: { padding: 18, paddingBottom: 40 },
  petCard: {
    ...surface,
    padding: 16,
    marginBottom: 18,
  },
  kicker: {
    fontFamily: fonts.sansSemi,
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroName: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, marginTop: 4 },
  heroMeta: { fontFamily: fonts.sans, color: colors.muted, marginTop: 6 },
  section: { fontFamily: fonts.sansExtra, fontSize: 16, color: colors.ink, marginBottom: 10 },
  title: { fontFamily: fonts.sansExtra, fontSize: 20, color: colors.ink, marginTop: 18 },
  sub: { fontFamily: fonts.sans, color: colors.muted, marginVertical: 10, lineHeight: 20 },
  block: { marginBottom: 14 },
  q: { fontFamily: fonts.sansSemi, color: colors.ink, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  opt: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  optText: { fontFamily: fonts.sansBold, color: colors.ink },
  optTextOn: { color: colors.white },
  input: {
    minHeight: 80,
    ...surface,
    padding: 14,
    fontFamily: fonts.sans,
    color: colors.ink,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  call: {
    backgroundColor: colors.navy,
    borderRadius: radius.pill,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  callText: { fontFamily: fonts.sansBold, color: colors.white, fontSize: 15 },
});
