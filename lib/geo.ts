import { ROSARIO } from '@/data/mock';

export type Coord = { latitude: number; longitude: number };

export function haversineKm(a: Coord, b: Coord) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function offsetFrom(
  latitude: number,
  longitude: number,
  meters: number,
  headingDeg: number,
) {
  const heading = (headingDeg * Math.PI) / 180;
  const dLat = (meters * Math.cos(heading)) / 111_320;
  const dLng = (meters * Math.sin(heading)) / (111_320 * Math.cos((latitude * Math.PI) / 180));
  return { latitude: latitude + dLat, longitude: longitude + dLng };
}

export function fallbackPing(seed: string) {
  const n = seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return offsetFrom(ROSARIO.latitude, ROSARIO.longitude, 180 + (n % 220), n % 360);
}
