import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { places, ROSARIO } from '@/data/mock';
import type { DogWalker, Place, PlaceKind } from '@/data/types';
import { walkers } from '@/data/walkers';
import { formatKm, kindLabel } from '@/lib/format';
import { mapFilterColors, mapPinHue } from '@/lib/map-colors';
import { resolvePlace } from '@/lib/place';
import { resolveWalker } from '@/lib/walker';
import { useApp } from '@/store/app-store';
import { cardShape, colors, fonts, radius, shadow } from '@/theme/tokens';

type FilterId = 'all' | PlaceKind | 'walk';

type MapItem =
  | { type: 'place'; id: string; place: Place }
  | { type: 'walker'; id: string; walker: DogWalker };

const filters: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'walk', label: 'Paseos' },
  { id: 'petshop', label: 'Petshops' },
  { id: 'vet', label: 'Vets' },
  { id: 'vet24', label: '24 hs' },
  { id: 'grooming', label: 'Pelu' },
];

export default function MapScreen() {
  const router = useRouter();
  const { placePhotos, placeAvatars, walkerProfiles } = useApp();
  const [filter, setFilter] = useState<FilterId>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const list = useMemo<MapItem[]>(() => {
    const shop: MapItem[] =
      filter === 'walk'
        ? []
        : places
            .filter((p) => filter === 'all' || p.kind === filter)
            .map((p) => ({ type: 'place', id: p.id, place: resolvePlace(p, placePhotos, placeAvatars) }));
    const nearby: MapItem[] =
      filter === 'all' || filter === 'walk'
        ? walkers
            .map((w) => resolveWalker(w, walkerProfiles))
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .map((w) => ({ type: 'walker' as const, id: w.id, walker: w }))
        : [];
    return [...nearby, ...shop];
  }, [filter, placePhotos, placeAvatars, walkerProfiles]);

  const current = list.find((p) => p.id === selected);

  const openItem = (item: MapItem) => {
    if (item.type === 'walker') router.push(`/walkers/${item.id}` as never);
    else if (item.place.kind === 'petshop') router.push(`/shop/${item.id}`);
    else router.push(`/booking/${item.id}`);
  };

  const photo = current
    ? current.type === 'walker'
      ? current.walker.photo
      : current.place.avatarUri
    : undefined;
  const name = current
    ? current.type === 'walker'
      ? current.walker.name
      : current.place.name
    : '';
  const kind = current
    ? current.type === 'walker'
      ? 'Paseaperros'
      : kindLabel(current.place.kind)
    : '';
  const meta = current
    ? current.type === 'walker'
      ? `${current.walker.neighborhood} · ${formatKm(current.walker.distanceKm)}`
      : `${current.place.neighborhood} · ${formatKm(current.place.distanceKm)}`
    : '';
  const blurb = current
    ? current.type === 'walker'
      ? current.walker.bio
      : current.place.blurb
    : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>En mi zona</Text>
      <View style={styles.filterBar}>
        {filters.map((f) => {
          const color = mapFilterColors[f.id];
          const on = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => {
                setFilter(f.id);
                setSelected(null);
              }}
              style={[
                styles.chip,
                { borderColor: color },
                on && { backgroundColor: color, borderColor: color },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: on ? colors.white : color }]} />
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.mapBox}>
        {Platform.OS === 'web' ? (
          <View style={styles.webFallback}>
            <Text style={styles.webText}>El mapa nativo corre en Expo Go (Android / iOS).</Text>
          </View>
        ) : (
          <NativeMap list={list} selected={selected ?? undefined} onSelect={setSelected} />
        )}

        {current && photo ? (
          <Pressable style={styles.callout} onPress={() => openItem(current)}>
            <View style={styles.tail} />
            <Image source={{ uri: photo }} style={styles.calloutPhoto} contentFit="cover" />
            <View style={styles.calloutBody}>
              <Text style={styles.calloutName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.calloutKind} numberOfLines={1}>
                {kind} · {meta}
              </Text>
              <Text style={styles.calloutBlurb} numberOfLines={2}>
                {blurb}
              </Text>
            </View>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function NativeMap({
  list,
  selected,
  onSelect,
}: {
  list: MapItem[];
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const MapView = require('react-native-maps').default;
  const Marker = require('react-native-maps').Marker;

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={{
        latitude: ROSARIO.latitude,
        longitude: ROSARIO.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      }}
    >
      {list.map((item) => {
        const coord = item.type === 'place' ? item.place.coordinate : item.walker.coordinate;
        const kind = item.type === 'walker' ? 'walk' : item.place.kind;
        return (
          <Marker
            key={`${item.type}-${item.id}`}
            coordinate={coord}
            pinColor={mapPinHue(kind, selected === item.id)}
            onPress={() => onSelect(item.id)}
          />
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 16, paddingBottom: 86 },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, marginBottom: 10, flexShrink: 0 },
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    flexShrink: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13 },
  chipTextOn: { color: colors.white },
  mapBox: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: Platform.OS === 'android' ? 'visible' : 'hidden',
    backgroundColor: colors.creamDeep,
    minHeight: 280,
    borderWidth: 1,
    borderColor: colors.line,
  },
  webFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  webText: { fontFamily: fonts.sans, color: colors.muted, textAlign: 'center' },
  callout: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    ...cardShape(16),
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    paddingRight: 12,
    ...shadow.float,
  },
  tail: {
    position: 'absolute',
    top: -7,
    left: 28,
    width: 14,
    height: 14,
    backgroundColor: colors.white,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: colors.line,
    transform: [{ rotate: '45deg' }],
  },
  calloutPhoto: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.creamDeep,
  },
  calloutBody: { flex: 1 },
  calloutName: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 16 },
  calloutKind: { fontFamily: fonts.sansSemi, color: colors.teal, marginTop: 3, fontSize: 12 },
  calloutBlurb: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4, fontSize: 12, lineHeight: 16 },
});
