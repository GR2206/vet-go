import type { Place } from '@/data/types';

export function resolvePlace(
  place: Place,
  photos: Record<string, string>,
  avatars: Record<string, string> = {},
): Place {
  return {
    ...place,
    photoUri: photos[place.id] ?? place.photoUri,
    avatarUri: avatars[place.id] ?? place.avatarUri,
  };
}
