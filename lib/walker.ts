import type { DogWalker, WalkerProfilePatch } from '@/data/types';
import { yearsOnApp } from '@/lib/schedule';

export function resolveWalker(walker: DogWalker, profiles: Record<string, WalkerProfilePatch>): DogWalker {
  const patch = profiles[walker.id];
  if (!patch) return walker;
  return { ...walker, ...patch };
}

export function tenureLabel(walker: DogWalker) {
  const onApp = yearsOnApp(walker.joinedAt);
  const since = walker.joinedAt.slice(0, 4);
  const tenure =
    onApp < 1
      ? `en PETS&GO desde ${since}`
      : `${onApp} ${onApp === 1 ? 'año' : 'años'} en PETS&GO (desde ${since})`;
  return `${walker.years} años de oficio · ${tenure}`;
}
