import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CatSilhouette, DogSilhouette } from '@/components/brand/PetSilhouettes';
import { Button } from '@/components/ui/Button';
import type { Pet } from '@/data/types';
import { colors, fonts, radius, surface } from '@/theme/tokens';

type Draft = {
  name: string;
  species: Pet['species'];
  breed: string;
  sex: Pet['sex'];
  ageYears: string;
  weightKg: string;
  heightCm: string;
  chip: string;
  nextVaccine: string;
  lastVaccine: string;
  lastBath: string;
  lastVisit: string;
  vetName: string;
  photoUri?: string;
};

function fromPet(pet: Pet): Draft {
  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    ageYears: String(pet.ageYears),
    weightKg: String(pet.weightKg).replace('.', ','),
    heightCm: String(pet.heightCm ?? ''),
    chip: pet.chip ?? '',
    nextVaccine: pet.nextVaccine ?? '',
    lastVaccine: pet.lastVaccine ?? '',
    lastBath: pet.lastBath ?? '',
    lastVisit: pet.lastVisit ?? '',
    vetName: pet.vetName ?? '',
    photoUri: pet.photoUri,
  };
}

export function PetEditorSheet({
  open,
  pet,
  onClose,
  onSave,
}: {
  open: boolean;
  pet: Pet | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Pet>) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (open && pet) setDraft(fromPet(pet));
  }, [open, pet]);

  if (!pet) return null;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso', 'Necesitamos acceso a tus fotos para la ficha.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) set('photoUri', result.assets[0].uri);
  };

  const save = () => {
    if (!draft) return;
    const age = Number(draft.ageYears.replace(',', '.'));
    const weight = Number(draft.weightKg.replace(',', '.'));
    const height = Number(draft.heightCm.replace(',', '.'));
    onSave(pet.id, {
      name: draft.name.trim() || pet.name,
      species: draft.species,
      breed: draft.breed.trim() || pet.breed,
      sex: draft.sex,
      ageYears: Number.isFinite(age) ? age : pet.ageYears,
      weightKg: Number.isFinite(weight) ? weight : pet.weightKg,
      heightCm: Number.isFinite(height) ? height : pet.heightCm,
      chip: draft.chip.trim(),
      nextVaccine: draft.nextVaccine.trim(),
      lastVaccine: draft.lastVaccine.trim(),
      lastBath: draft.lastBath.trim(),
      lastVisit: draft.lastVisit.trim(),
      vetName: draft.vetName.trim(),
      photoUri: draft.photoUri,
    });
    onClose();
  };

  if (!draft) return null;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.bg}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Editar cartilla</Text>
          <Text style={styles.sub}>Corregí foto y datos. La tarjeta de inicio se ve igual.</Text>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            <Pressable onPress={pickPhoto} style={styles.photoWrap}>
              {draft.photoUri ? (
                <Image source={{ uri: draft.photoUri }} style={styles.photo} />
              ) : (
                <View style={styles.photoFallback}>
                  {draft.species === 'dog' ? (
                    <DogSilhouette size={54} color={colors.navy} />
                  ) : (
                    <CatSilhouette size={50} color={colors.navy} />
                  )}
                </View>
              )}
              <Text style={styles.photoHint}>Cambiar foto</Text>
            </Pressable>

            <Field label="Nombre" value={draft.name} onChange={(v) => set('name', v)} />
            <Text style={styles.label}>Especie</Text>
            <View style={styles.pills}>
              {(['dog', 'cat'] as const).map((sp) => (
                <Pressable
                  key={sp}
                  onPress={() => set('species', sp)}
                  style={[styles.pill, draft.species === sp && styles.pillOn]}
                >
                  <Text style={[styles.pillText, draft.species === sp && styles.pillTextOn]}>
                    {sp === 'dog' ? 'Perro' : 'Gato'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Field label="Raza" value={draft.breed} onChange={(v) => set('breed', v)} />
            <Text style={styles.label}>Sexo</Text>
            <View style={styles.pills}>
              {(['macho', 'hembra'] as const).map((sx) => (
                <Pressable
                  key={sx}
                  onPress={() => set('sex', sx)}
                  style={[styles.pill, draft.sex === sx && styles.pillOn]}
                >
                  <Text style={[styles.pillText, draft.sex === sx && styles.pillTextOn]}>
                    {sx === 'macho' ? 'Macho' : 'Hembra'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Edad (años)"
                  value={draft.ageYears}
                  onChange={(v) => set('ageYears', v)}
                  keyboard="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Peso (kg)"
                  value={draft.weightKg}
                  onChange={(v) => set('weightKg', v)}
                  keyboard="decimal-pad"
                />
              </View>
            </View>
            <Field
              label="Altura (cm)"
              value={draft.heightCm}
              onChange={(v) => set('heightCm', v)}
              keyboard="decimal-pad"
            />
            <Field label="Chip" value={draft.chip} onChange={(v) => set('chip', v)} />
            <Field
              label="Último baño (ej. 11 ago 2026)"
              value={draft.lastBath}
              onChange={(v) => set('lastBath', v)}
            />
            <Field
              label="Última visita vet"
              value={draft.lastVisit}
              onChange={(v) => set('lastVisit', v)}
            />
            <Field
              label="Última vacuna (ej. 27 ago 2025)"
              value={draft.lastVaccine}
              onChange={(v) => set('lastVaccine', v)}
            />
            <Field
              label="Próxima vacuna"
              value={draft.nextVaccine}
              onChange={(v) => set('nextVaccine', v)}
            />
            <Field label="Veterinario" value={draft.vetName} onChange={(v) => set('vetName', v)} />
          </ScrollView>
          <View style={styles.actions}>
            <Button label="Cancelar" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <View style={{ width: 10 }} />
            <Button label="Guardar" onPress={save} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  keyboard?: 'decimal-pad' | 'default';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholderTextColor={colors.muted}
        keyboardType={keyboard ?? 'default'}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
    paddingHorizontal: 18,
    paddingBottom: 22,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: 12,
  },
  title: { fontFamily: fonts.sansExtra, fontSize: 20, color: colors.ink },
  sub: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4, marginBottom: 12, fontSize: 13 },
  scroll: { paddingBottom: 12 },
  photoWrap: { alignItems: 'center', marginBottom: 14 },
  photo: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.creamDeep },
  photoFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.creamDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: { fontFamily: fonts.sansSemi, color: colors.teal, marginTop: 8, fontSize: 13 },
  label: { fontFamily: fonts.sansSemi, color: colors.muted, fontSize: 12, marginBottom: 6 },
  input: {
    ...surface,
    minHeight: 46,
    paddingHorizontal: 14,
    fontFamily: fonts.sans,
    color: colors.ink,
    fontSize: 15,
  },
  pills: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.creamDeep,
  },
  pillOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  pillText: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13 },
  pillTextOn: { color: colors.white },
  row: { flexDirection: 'row', gap: 10 },
  actions: { flexDirection: 'row', paddingTop: 8 },
});
