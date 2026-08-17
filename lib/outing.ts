import { ROSARIO } from '@/data/mock';
import { walkSpots, type WalkSpot } from '@/data/walk-spots';
import type { Coord } from '@/lib/geo';
import { haversineKm } from '@/lib/geo';
import type { WeatherNow } from '@/lib/weather';

export type { WalkSpot };
export { walkSpots };

const MONTH_LO_HI: [number, number][] = [
  [20, 32],
  [19, 30],
  [17, 27],
  [13, 23],
  [10, 19],
  [6, 16],
  [6, 16],
  [8, 18],
  [9, 21],
  [13, 24],
  [16, 27],
  [18, 30],
];

export function rosarioTempC(now = Date.now()) {
  const d = new Date(now);
  const [lo, hi] = MONTH_LO_HI[d.getMonth()];
  const h = d.getHours() + d.getMinutes() / 60;
  const peak = 15.6;
  const wave =
    h <= peak
      ? Math.sin(Math.max(0, (h - 6) / (peak - 6)) * (Math.PI / 2))
      : Math.cos(Math.min(1, (h - peak) / 8.4) * (Math.PI / 2));
  return Math.round(lo + (hi - lo) * Math.max(0, Math.min(1, wave)));
}

export function clockHm(now = Date.now()) {
  const d = new Date(now);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function kmLabel(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function nearestSpot(from?: Coord | null): WalkSpot {
  const origin = from ?? ROSARIO;
  return walkSpots
    .map((spot) => ({
      ...spot,
      km: haversineKm(origin, spot.coordinate),
    }))
    .sort((a, b) => a.km - b.km)[0];
}

export function outingCopy(now = Date.now(), weather?: WeatherNow | null) {
  const h = new Date(now).getHours();
  const temp = weather?.tempC ?? rosarioTempC(now);
  if (h >= 21 || h < 6) return null;
  if (weather?.raining) {
    return { emoji: '🌧️', title: 'Hoy llueve: paseo cortito', ideal: false, temp, sky: weather.label };
  }
  if (temp >= 29) {
    return { emoji: '☀️', title: 'Calor: mejor sombra y agua', ideal: false, temp, sky: weather?.label };
  }
  if (temp < 12) {
    return { emoji: '🧣', title: 'Paseo cortito, hace frío', ideal: false, temp, sky: weather?.label };
  }
  return { emoji: '☀️', title: 'Día ideal para pasear', ideal: true, temp, sky: weather?.label };
}
