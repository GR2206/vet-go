import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CatSilhouette, DogSilhouette } from '@/components/brand/PetSilhouettes';
import { Button } from '@/components/ui/Button';
import { zones } from '@/data/mock';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius } from '@/theme/tokens';

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding, user } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog');
  const [zone, setZone] = useState(user?.zone ?? zones[0]);

  const next = async () => {
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    await completeOnboarding(
      {
        zone,
      },
      {
        name: name.trim() || 'Max',
        species,
      },
    );
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.kicker}>PETS&GO</Text>
      <Text style={styles.progress}>Paso {step + 1} de 3</Text>

      {step === 0 && (
        <View style={styles.block}>
          <Text style={styles.title}>¿Cómo se llama tu compañero?</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Max, Luna, Coco..."
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>
      )}

      {step === 1 && (
        <View style={styles.block}>
          <Text style={styles.title}>¿Perro o gato?</Text>
          <View style={styles.row}>
            <Pressable
              onPress={() => setSpecies('dog')}
              style={[styles.species, species === 'dog' && styles.speciesOn]}
            >
              <DogSilhouette size={88} color={species === 'dog' ? colors.navy : colors.muted} />
              <Text style={styles.speciesLabel}>Perro</Text>
            </Pressable>
            <Pressable
              onPress={() => setSpecies('cat')}
              style={[styles.species, species === 'cat' && styles.speciesOn]}
            >
              <CatSilhouette size={78} color={species === 'cat' ? colors.navy : colors.muted} />
              <Text style={styles.speciesLabel}>Gato</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={styles.block}>
          <Text style={styles.title}>¿En qué zona de Rosario estás?</Text>
          <View style={styles.chips}>
            {zones.map((z) => (
              <Pressable
                key={z}
                onPress={() => setZone(z)}
                style={[styles.chip, zone === z && styles.chipOn]}
              >
                <Text style={[styles.chipText, zone === z && styles.chipTextOn]}>{z}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Button label={step === 2 ? 'Entrar a PETS&GO' : 'Continuar'} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream, padding: 22 },
  kicker: {
    fontFamily: fonts.display,
    color: colors.navy,
    fontSize: 18,
    letterSpacing: 1,
  },
  progress: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4 },
  block: { flex: 1, justifyContent: 'center' },
  title: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 38,
    color: colors.ink,
    marginBottom: 22,
  },
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
  row: { flexDirection: 'row', gap: 12 },
  species: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    alignItems: 'center',
    paddingVertical: 22,
    borderWidth: 2,
    borderColor: colors.line,
  },
  speciesOn: { borderColor: colors.teal, backgroundColor: colors.tealSoft },
  speciesLabel: { fontFamily: fonts.sansBold, marginTop: 8, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontFamily: fonts.sansSemi, color: colors.ink },
  chipTextOn: { color: colors.white },
  footer: { paddingBottom: 8 },
});
