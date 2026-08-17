import type { PlaceKind } from '@/data/types';

export const mapFilterColors: Record<'all' | 'walk' | PlaceKind, string> = {
  all: '#141E2E',
  walk: '#2F8F74',
  petshop: '#C4893A',
  vet: '#3B74B0',
  vet24: '#C85A5A',
  grooming: '#7A72C4',
};

export function pinColorFor(kind: 'walk' | PlaceKind) {
  return mapFilterColors[kind];
}

/** Colores nativos de Google Maps (se leen bien en el mapa). */
export function mapPinHue(kind: 'walk' | PlaceKind, selected?: boolean) {
  if (selected) return 'teal';
  switch (kind) {
    case 'walk':
      return 'green';
    case 'petshop':
      return 'orange';
    case 'vet':
      return 'blue';
    case 'vet24':
      return 'tomato';
    case 'grooming':
      return 'violet';
    default:
      return 'teal';
  }
}
