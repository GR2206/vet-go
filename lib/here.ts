import * as Location from 'expo-location';

import { ROSARIO } from '@/data/mock';
import type { Coord } from '@/lib/geo';

export type Origin = Coord & { source: 'gps' | 'fallback' };

export async function deviceOrigin(): Promise<Origin> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { ...ROSARIO, source: 'fallback' };
    const last = await Location.getLastKnownPositionAsync();
    if (last?.coords) {
      return {
        latitude: last.coords.latitude,
        longitude: last.coords.longitude,
        source: 'gps',
      };
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      source: 'gps',
    };
  } catch {
    return { ...ROSARIO, source: 'fallback' };
  }
}
