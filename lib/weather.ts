export type WeatherNow = {
  tempC: number;
  code: number;
  label: string;
  raining: boolean;
};

type Cache = { at: number; key: string; data: WeatherNow };

let cache: Cache | null = null;
const TTL_MS = 15 * 60_000;

export function isPrecip(code: number) {
  return code >= 51;
}

export function weatherLabel(code: number) {
  if (code === 0) return 'cielo claro';
  if (code <= 3) return 'algo nublado';
  if (code <= 48) return 'niebla';
  if (code <= 57) return 'llovizna';
  if (code <= 67) return 'lluvia';
  if (code <= 77) return 'nieve';
  if (code <= 82) return 'chaparrones';
  if (code <= 99) return 'tormenta';
  return 'cielo mixto';
}

export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherNow | null> {
  const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  if (cache && cache.key === key && Date.now() - cache.at < TTL_MS) return cache.data;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,weather_code&timezone=auto`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return cache?.data ?? null;
    const json = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const tempC = Math.round(Number(json.current?.temperature_2m));
    const code = Number(json.current?.weather_code);
    if (!Number.isFinite(tempC) || !Number.isFinite(code)) return cache?.data ?? null;
    const data: WeatherNow = {
      tempC,
      code,
      label: weatherLabel(code),
      raining: isPrecip(code),
    };
    cache = { at: Date.now(), key, data };
    return data;
  } catch {
    return cache?.data ?? null;
  }
}
