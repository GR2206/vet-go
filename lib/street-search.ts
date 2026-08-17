import { ROSARIO } from '@/data/mock';

export const SHIP_CITIES = [
  'Rosario',
  'Funes',
  'Roldán',
  'Pérez',
  'Villa Gobernador Gálvez',
  'Granadero Baigorria',
  'San Lorenzo',
  'Capitán Bermúdez',
  'Fray Luis Beltrán',
  'Puerto General San Martín',
  'Arroyo Seco',
  'Alvear',
  'Pueblo Esther',
  'Ibarlucea',
  'Soldini',
  'Zavalla',
] as const;

export function isShipCity(value: string): value is (typeof SHIP_CITIES)[number] {
  return (SHIP_CITIES as readonly string[]).includes(value);
}

export type StreetHit = {
  id: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  postcode: string;
  label: string;
};

const STREETS = [
  'San Martín',
  'Córdoba',
  'Santa Fe',
  'Pellegrini',
  'Ovidio Lagos',
  'Mendoza',
  'Rioja',
  'Mitre',
  'Entre Ríos',
  'Corrientes',
  'Buenos Aires',
  'Maipú',
  '9 de Julio',
  '27 de Febrero',
  'Francia',
  'Italia',
  'España',
  'Paraguay',
  'Uruguay',
  'Wheelwright',
  'Avellaneda',
  'Alberdi',
  'Brown',
  'Necochea',
  'San Juan',
  'San Luis',
  'Tucumán',
  'Salta',
  'Jujuy',
  'Catamarca',
  'La Paz',
  '3 de Febrero',
  'Balcarce',
  'Presidente Roca',
  'Sarmiento',
  'Belgrano',
  'Rivadavia',
  'Moreno',
  'Dorrego',
  'Cafferata',
  'Vera Mujica',
  'Bv. Oroño',
  'Bv. Argentino',
  'Av. Circunvalación',
  'Av. Godoy',
  'Av. Provincias Unidas',
  'Av. Eva Perón',
  'Av. Battle y Ordóñez',
  'Av. Presidente Perón',
  'Av. Jorge Newbery',
  'Av. Uriburu',
  'Av. Pellegrini',
  'Av. Francia',
  'Av. Ovidio Lagos',
  'Av. San Martín',
  'Av. Sabin',
  'Italia',
  'Crespo',
  'Suipacha',
  'Laprida',
  'San Lorenzo',
  'Zeballos',
  '1º de Mayo',
  '25 de Mayo',
  '9 de Julio',
  'Pichincha',
  'Ocampo',
  'España',
  'Montevideo',
  'Callao',
  'Pasco',
  'Riobamba',
  'Rodriguez',
  'Nansen',
  'Cerrito',
  'Virasoro',
  'Nansen',
  'Amenábar',
  'Thedy',
  'Schweitzer',
  'José Ingenieros',
  'Junín',
  'Tucumán',
  'Salta',
  'La Rioja',
  'Santiago',
  'Chacabuco',
  'Dean Funes',
  'Echagüe',
  'Nansen',
  'Pje. Álvarez',
  'Av. Pellegrini',
  'Av. Pellegrini',
  'Av. Pellegrini',
  'José María Paz',
  'Nansen',
  'Av. del Rosario',
  'Av. de Circunvalación',
  'Ruta 9',
  'Ruta 33',
  'Ruta 34',
  'Ruta 11',
  'Bv. 27 de Febrero',
  'Av. Alberdi',
  'Av. Arijon',
  'Av. Arijón',
  'Av. Battle',
  'Av. Belgrano',
  'Av. Francia',
  'Av. Godoy',
  'Av. Mendoza',
  'Av. Ovidio Lagos',
  'Av. Pellegrini',
  'Av. Provincias Unidas',
  'Av. San Martín',
  'Bv. Seguí',
  'Bv. Oroño',
  'Bv. Rondeau',
  'Bv. Avellaneda',
  'Italia 400',
  'San Martín 800',
];

function fold(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function asHit(street: string, city: string): StreetHit {
  return {
    id: `local-${street}`,
    street,
    number: '',
    neighborhood: '',
    city,
    postcode: '',
    label: `${street}, ${city}`,
  };
}

export function localStreets(query: string, city: string): StreetHit[] {
  const n = fold(query);
  if (!n) return [];
  const scored = STREETS.filter((s, i, arr) => arr.indexOf(s) === i)
    .map((street) => {
      const f = fold(street);
      const start = f.startsWith(n);
      const word = f.split(' ').some((w) => w.startsWith(n));
      const has = f.includes(n);
      if (!has) return null;
      const score = start ? 0 : word ? 1 : 2;
      return { street, score, len: street.length };
    })
    .filter((x): x is { street: string; score: number; len: number } => Boolean(x))
    .sort((a, b) => a.score - b.score || a.len - b.len)
    .slice(0, 8);
  return scored.map((s) => asHit(s.street, city));
}

function stripNumber(street: string, house: string) {
  const raw = street.trim();
  if (!house) return raw.replace(/,?\s+\d{1,5}\s*$/, '').trim();
  const safe = house.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return raw.replace(new RegExp(`\\s*${safe}\\s*$`), '').trim() || raw;
}

function mapPhoton(feature: { properties?: Record<string, unknown> }): StreetHit | null {
  const p = feature.properties ?? {};
  const str = (key: string) => {
    const v = p[key];
    return v == null ? '' : String(v);
  };
  if (str('countrycode') && str('countrycode').toLowerCase() !== 'ar') return null;
  const street = stripNumber(str('street') || str('name'), str('housenumber'));
  if (!street) return null;
  const city = str('city') || str('town') || str('village') || str('county');
  const neighborhood = str('district') || str('locality') || str('suburb');
  const number = str('housenumber');
  const label = [street, number, neighborhood, city].filter(Boolean).join(', ');
  return {
    id: `${street}-${number}-${city}-${neighborhood}`,
    street,
    number,
    neighborhood,
    city,
    postcode: str('postcode'),
    label,
  };
}

function mergeHits(base: StreetHit[], extra: StreetHit[]) {
  const uniq = new Map<string, StreetHit>();
  for (const h of [...base, ...extra]) {
    const key = fold(`${h.street}|${h.number}|${h.city}`);
    if (!uniq.has(key)) uniq.set(key, h);
  }
  return [...uniq.values()].slice(0, 8);
}

export async function searchStreetsRemote(query: string, city: string): Promise<StreetHit[]> {
  const q = query.trim();
  if (!q) return [];
  const phrase = `${q} ${city}`;
  const ctrl = new AbortController();
  const kill = setTimeout(() => ctrl.abort(), 1800);
  try {
    const photon = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(phrase)}&limit=8&lang=es&lat=${ROSARIO.latitude}&lon=${ROSARIO.longitude}`,
      { signal: ctrl.signal },
    );
    if (!photon.ok) return [];
    const data = (await photon.json()) as { features?: { properties?: Record<string, unknown> }[] };
    return (data.features ?? []).map(mapPhoton).filter((h): h is StreetHit => Boolean(h));
  } catch {
    return [];
  } finally {
    clearTimeout(kill);
  }
}
