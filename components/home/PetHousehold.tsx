import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { CatSilhouette, DogSilhouette } from '@/components/brand/PetSilhouettes';
import { PetEditorSheet } from '@/components/home/PetEditorSheet';
import { MetalFill } from '@/components/ui/MetalFill';
import type { Pet } from '@/data/types';
import { cardShape, colors, fonts, radius, shadow } from '@/theme/tokens';

type Props = {
  pets: Pet[];
  activeId: string | null;
  points: number;
  vip: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Pet>) => void;
  onAdd: (species: 'dog' | 'cat') => void;
};

export function PetHousehold({ pets, activeId, points, vip, onSelect, onUpdate, onAdd }: Props) {
  const active = pets.find((p) => p.id === activeId) ?? pets[0];
  const [editing, setEditing] = useState(false);

  if (!active) return null;

  return (
    <View style={styles.wrap}>
      {pets.length > 0 ? (
        <View style={styles.tabs}>
          {pets.map((p, i) => {
            const on = p.id === active.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => onSelect(p.id)}
                style={[
                  styles.tab,
                  on && styles.tabOn,
                  { zIndex: on ? 20 : 10 - i, marginLeft: i === 0 ? 0 : -12 },
                ]}
              >
                <View style={styles.tabDot}>
                  {p.photoUri ? (
                    <Image source={{ uri: p.photoUri }} style={styles.tabImg} />
                  ) : p.species === 'dog' ? (
                    <DogSilhouette size={18} color={colors.navy} />
                  ) : (
                    <CatSilhouette size={17} color={colors.navy} />
                  )}
                </View>
                <Text numberOfLines={1} style={[styles.tabName, on && styles.tabNameOn]}>
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() =>
              Alert.alert('Sumar mascota', '¿Perro o gato?', [
                { text: 'Perro', onPress: () => onAdd('dog') },
                { text: 'Gato', onPress: () => onAdd('cat') },
                { text: 'Cancelar', style: 'cancel' },
              ])
            }
            style={styles.tabAdd}
          >
            <Text style={styles.tabAddText}>+</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.cardLift, pets.length > 1 && styles.cardJoined]}>
        <View style={[styles.card, pets.length > 1 && styles.cardJoined]}>
          <Pressable onPress={() => setEditing(true)} style={styles.avatarWrap}>
            <MetalFill style={styles.ring} contentStyle={styles.ringInner}>
              <Portrait pet={active} />
            </MetalFill>
            <View style={styles.cam}>
              <Text style={styles.camText}>✎</Text>
            </View>
          </Pressable>

        <View style={styles.data}>
          <Text style={styles.kicker}>{vip ? 'Familia VIP' : 'Cartilla'}</Text>
          <Text style={styles.name}>{active.name}</Text>
          <Text style={styles.line}>
            {active.breed} · {active.sex} · {active.ageYears} años
          </Text>
          <Text style={styles.line}>
            {String(active.weightKg).replace('.', ',')} kg · {active.heightCm ?? 52} cm
          </Text>
          <Text style={styles.chip}>Chip {active.chip}</Text>
          <Text style={styles.care}>
            {active.lastVaccine ? `Últ. vacuna ${active.lastVaccine} · ` : ''}
            Próx. {active.nextVaccine} · {active.vetName}
          </Text>
        </View>

        <View style={styles.points}>
          <Text style={styles.pointsN}>{points}</Text>
          <Text style={styles.pointsL}>{vip ? 'VIP' : 'pts'}</Text>
        </View>
        </View>
      </View>

      <PetEditorSheet
        open={editing}
        pet={active}
        onClose={() => setEditing(false)}
        onSave={onUpdate}
      />
    </View>
  );
}

function Portrait({ pet }: { pet: Pet }) {
  return (
    <View style={styles.lens}>
      <View style={styles.lensFill}>
        {pet.photoUri ? (
          <Image source={{ uri: pet.photoUri }} style={styles.avatar} />
        ) : (
          <View style={styles.fallback}>
            {pet.species === 'dog' ? (
              <DogSilhouette size={62} color={colors.navy} />
            ) : (
              <CatSilhouette size={58} color={colors.navy} />
            )}
          </View>
        )}
      </View>
      <LinearGradient
        colors={['rgba(255,255,255,0.2)', 'transparent', 'rgba(12,22,38,0.32)']}
        locations={[0, 0.45, 1]}
        style={styles.shade}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 12, marginTop: -52 },
  tabs: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    maxWidth: 148,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.line,
  },
  tabOn: { backgroundColor: colors.white, paddingBottom: 12 },
  tabDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 7,
    backgroundColor: colors.creamDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabImg: { width: 24, height: 24 },
  tabName: { fontFamily: fonts.sansSemi, color: colors.navy, fontSize: 14, maxWidth: 88 },
  tabNameOn: { fontFamily: fonts.sansBold },
  tabAdd: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...shadow.card,
  },
  tabAddText: { fontFamily: fonts.sansBold, color: colors.navy, fontSize: 18, marginTop: -2 },
  cardLift: {
    ...cardShape(radius.xl),
    ...shadow.float,
  },
  card: {
    backgroundColor: colors.white,
    ...cardShape(radius.xl),
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardJoined: { borderTopLeftRadius: 0 },
  avatarWrap: {
    marginRight: 16,
    shadowColor: '#141E2E',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  ring: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  ringInner: {
    width: 108,
    height: 108,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lens: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: colors.creamDeep,
  },
  lensFill: {
    width: 100,
    height: 100,
  },
  shade: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
  },
  avatar: { width: 100, height: 100, backgroundColor: colors.creamDeep },
  fallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.creamDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cam: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  camText: { color: colors.white, fontSize: 12 },
  data: { flex: 1, justifyContent: 'center' },
  kicker: {
    fontFamily: fonts.sansSemi,
    color: colors.teal,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  name: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, marginTop: 2 },
  line: { fontFamily: fonts.sans, color: colors.ink, fontSize: 14, marginTop: 3, lineHeight: 20 },
  chip: { fontFamily: fonts.sans, color: colors.muted, fontSize: 13, marginTop: 5 },
  care: { fontFamily: fonts.sansMedium, color: colors.muted, fontSize: 13, marginTop: 8 },
  points: { alignItems: 'center', paddingLeft: 6, minWidth: 44 },
  pointsN: { fontFamily: fonts.sansExtra, color: colors.navy, fontSize: 22, textAlign: 'center' },
  pointsL: { fontFamily: fonts.sans, color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 1 },
});
