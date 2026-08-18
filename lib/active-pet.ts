import type { Pet } from '@/data/types';

/** Mascota de la cartilla principal: la activa, o la primera si hay varias. */
export function cartillaPet(pets: Pet[] | undefined, activePetId?: string | null): Pet | null {
  if (!pets?.length) return null;
  return pets.find((p) => p.id === activePetId) ?? pets[0] ?? null;
}

export function threadPetFromCartilla(pet: Pet | null) {
  const petName = pet?.name?.trim();
  if (!petName) return null;
  const petSpecies = pet.species === 'cat' || pet.species === 'dog' ? pet.species : undefined;
  return petSpecies ? { petName, petSpecies } : { petName };
}
