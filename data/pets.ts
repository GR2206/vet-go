import { photos } from './media';
import type { Pet, Species } from './types';
import { DAY_MS, esDateLabel } from '@/lib/dates';

export function createPet(
  partial: Pick<Pet, 'name' | 'species'> & Partial<Pet>,
): Pet {
  const species = partial.species;
  const isDog = species === 'dog';
  return {
    id: partial.id ?? `pet-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    name: partial.name,
    species,
    ageYears: partial.ageYears ?? (isDog ? 3 : 2),
    breed: partial.breed ?? (isDog ? 'Mestizo mediano' : 'Mestizo pelo corto'),
    photoUri: partial.photoUri ?? (isDog ? photos.dog : photos.cat),
    sex: partial.sex ?? (isDog ? 'macho' : 'hembra'),
    weightKg: partial.weightKg ?? (isDog ? 28.4 : 4.2),
    chip: partial.chip ?? (isDog ? '981 140 000 332 118' : '981 140 000 774 201'),
    lastVisit: partial.lastVisit ?? '3 mar 2026',
    lastBath: partial.lastBath ?? esDateLabel(Date.now() - 5 * DAY_MS),
    lastVaccine: partial.lastVaccine ?? '27 ago 2025',
    nextVaccine: partial.nextVaccine ?? '27 ago 2026',
    vetName: partial.vetName ?? 'Dr. Alejandro Ruiz',
    heightCm: partial.heightCm ?? (isDog ? 58 : 24),
    healthy: partial.healthy ?? true,
  };
}

export function companionPet(main: Pet): Pet {
  const other: Species = main.species === 'dog' ? 'cat' : 'dog';
  return createPet({
    id: 'pet-mora',
    name: other === 'cat' ? 'Mora' : 'Coco',
    species: other,
    photoUri: other === 'cat' ? photos.cat : photos.dogAlt,
    ageYears: other === 'cat' ? 2 : 5,
    breed: other === 'cat' ? 'Europeo pelo corto' : 'Labrador mestizo',
    sex: other === 'cat' ? 'hembra' : 'macho',
    weightKg: other === 'cat' ? 4.1 : 31.2,
    chip: '981 140 000 551 009',
    lastVisit: '18 jun 2026',
    lastBath: esDateLabel(Date.now() - 9 * DAY_MS),
    lastVaccine: '2 sep 2025',
    nextVaccine: '2 sep 2026',
    vetName: 'Dra. Marina Soto',
  });
}
