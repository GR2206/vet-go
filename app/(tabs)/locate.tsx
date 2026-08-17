import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { collarBrands } from '@/data/trackers';
import type { CollarBrand } from '@/data/types';
import { fallbackPing, offsetFrom } from '@/lib/geo';
import { openNativeMaps } from '@/lib/open-maps';
import { useApp } from '@/store/app-store';
import { colors, fonts, radius, surface } from '@/theme/tokens';

export default function LocateScreen() {
  const router = useRouter();
  const { pet, trackers, associateTracker, removeTracker, updateTrackerPing } = useApp();
  const name = pet?.name ?? 'tu mascota';
  const tracker = pet ? trackers[pet.id] : undefined;
  const [brand, setBrand] = useState<CollarBrand>('apple');
  const [scanning, setScanning] = useState(false);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (!tracker) return;
    const id = setInterval(() => setPulse((p) => (p === 0 ? 1 : 0)), 900);
    return () => clearInterval(id);
  }, [tracker]);

  const ping = async (openMaps: boolean) => {
    if (!pet) return;
    let origin = fallbackPing(pet.id);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        origin = offsetFrom(
          pos.coords.latitude,
          pos.coords.longitude,
          90 + Math.round(Math.random() * 160),
          Math.round(Math.random() * 360),
        );
      }
    } catch {
      origin = fallbackPing(pet.id);
    }
    const accuracyM = 55 + Math.round(Math.random() * 90);
    updateTrackerPing(pet.id, { ...origin, accuracyM });
    if (openMaps) {
      await openNativeMaps({
        ...origin,
        label: `${name} · zona aproximada`,
      });
    }
    return { ...origin, accuracyM };
  };

  const pair = async () => {
    if (!pet) return;
    setScanning(true);
    await new Promise((r) => setTimeout(r, 1800));
    const picked = collarBrands.find((b) => b.id === brand)!;
    let origin = fallbackPing(pet.id);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        origin = offsetFrom(pos.coords.latitude, pos.coords.longitude, 120, 42);
      }
    } catch {
      origin = fallbackPing(pet.id);
    }
    const next = {
      petId: pet.id,
      brand,
      label: `${picked.name} de ${name}`,
      associatedAt: Date.now(),
      latitude: origin.latitude,
      longitude: origin.longitude,
      accuracyM: 70,
    };
    associateTracker(next);
    setScanning(false);
    Alert.alert(
      `${name} asociado`,
      `El rastreador ${picked.name} quedó en el collar. Abrimos el mapa con el radio de la última señal.`,
    );
    await openNativeMaps({
      latitude: next.latitude,
      longitude: next.longitude,
      label: `${name} · zona aproximada`,
    });
  };

  const brandName = useMemo(
    () => collarBrands.find((b) => b.id === tracker?.brand)?.name,
    [tracker],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Rastreador de collar</Text>
          <Text style={styles.title}>¿Dónde está {name}?</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/profile')} style={styles.club}>
          <Text style={styles.clubText}>Club</Text>
        </Pressable>
      </View>

      {tracker ? (
        <View style={styles.live}>
          <View style={styles.mapBox}>
            {Platform.OS === 'web' ? (
              <View style={styles.web}>
                <Text style={styles.webText}>El mapa nativo corre en Expo Go (iOS / Android).</Text>
              </View>
            ) : (
              <TrackerMap
                latitude={tracker.latitude}
                longitude={tracker.longitude}
                accuracyM={tracker.accuracyM}
                pulse={pulse}
                name={name}
              />
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.status}>Señal reciente · radio {Math.round(tracker.accuracyM)} m</Text>
            <Text style={styles.meta}>{tracker.label}</Text>
            <Text style={styles.meta}>{brandName} · tipo moneda para el collar</Text>
            <Button
              label={`Buscar a ${name}`}
              onPress={() => ping(true)}
              style={{ marginTop: 14 }}
            />
            <Button
              label="Desvincular rastreador"
              variant="ghost"
              onPress={() =>
                Alert.alert('¿Sacar el rastreador?', `Se deja de ubicar a ${name}.`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Desvincular', style: 'destructive', onPress: () => pet && removeTracker(pet.id) },
                ])
              }
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.coin}>
            <View style={styles.coinOuter}>
              <View style={styles.coinInner}>
                <Text style={styles.coinGlyph}>⌖</Text>
              </View>
            </View>
          </View>
          <Text style={styles.lead}>
            Asociá un rastreador tipo moneda (AirTag, Xiaomi, Samsung u otro) al collar de {name}.
            Después vemos el radio donde está, titilando en el mapa.
          </Text>
          <Text style={styles.step}>Elegí el dispositivo</Text>
          {collarBrands.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setBrand(item.id)}
              style={[styles.brand, brand === item.id && styles.brandOn]}
            >
              <Text style={styles.brandName}>{item.name}</Text>
              <Text style={styles.brandDetail}>{item.detail}</Text>
            </Pressable>
          ))}
          <Button
            label={scanning ? 'Buscando el rastreador…' : `Asociar rastreador de ${name}`}
            onPress={pair}
            style={{ marginTop: 8 }}
          />
          {scanning ? (
            <View style={styles.scan}>
              <ActivityIndicator color={colors.teal} />
              <Text style={styles.scanText}>Acercá la moneda al celular. Escaneando BLE…</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TrackerMap({
  latitude,
  longitude,
  accuracyM,
  pulse,
  name,
}: {
  latitude: number;
  longitude: number;
  accuracyM: number;
  pulse: number;
  name: string;
}) {
  const Maps = require('react-native-maps');
  const MapView = Maps.default;
  const Marker = Maps.Marker;
  const Circle = Maps.Circle;
  const radius = pulse ? accuracyM * 1.35 : accuracyM;
  const fill = pulse ? 'rgba(14,138,128,0.10)' : 'rgba(14,138,128,0.28)';

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }}
    >
      <Circle
        center={{ latitude, longitude }}
        radius={radius}
        strokeColor={colors.teal}
        fillColor={fill}
        strokeWidth={2}
      />
      <Marker
        coordinate={{ latitude, longitude }}
        title={name}
        description="Última zona reportada"
        pinColor="#0E8A80"
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  head: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  kicker: {
    fontFamily: fonts.sansSemi,
    color: colors.muted,
    letterSpacing: 1,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, marginTop: 4, lineHeight: 32 },
  club: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  clubText: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13 },
  live: { flex: 1, paddingHorizontal: 16, paddingBottom: 88 },
  mapBox: {
    flex: 1,
    minHeight: 280,
    borderRadius: radius.md,
    overflow: Platform.OS === 'android' ? 'visible' : 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.creamDeep,
  },
  web: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  webText: { fontFamily: fonts.sans, color: colors.muted, textAlign: 'center' },
  card: { ...surface, padding: 16, marginTop: 12 },
  status: { fontFamily: fonts.sansExtra, color: colors.ink, fontSize: 16 },
  meta: { fontFamily: fonts.sans, color: colors.muted, marginTop: 4 },
  scroll: { paddingHorizontal: 18, paddingBottom: 110 },
  coin: { alignItems: 'center', marginVertical: 10 },
  coinOuter: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.creamDeep,
  },
  coinInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinGlyph: { fontSize: 28, color: colors.navy },
  lead: { fontFamily: fonts.sans, color: colors.muted, lineHeight: 22, marginBottom: 18 },
  step: { fontFamily: fonts.sansExtra, color: colors.ink, marginBottom: 8 },
  brand: {
    ...surface,
    padding: 14,
    marginBottom: 8,
  },
  brandOn: { borderColor: colors.navy, borderWidth: 1.5 },
  brandName: { fontFamily: fonts.sansBold, color: colors.ink },
  brandDetail: { fontFamily: fonts.sans, color: colors.muted, marginTop: 3, fontSize: 13 },
  scan: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  scanText: { fontFamily: fonts.sans, color: colors.muted, flex: 1 },
});
