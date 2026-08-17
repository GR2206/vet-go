import type { Place, PlaceReview, Professional } from '@/data/types';
import { places } from '@/data/mock';
import { formatKm } from '@/lib/format';
import type { Coord } from '@/lib/geo';
import { haversineKm } from '@/lib/geo';

export type RankedStaff = Professional & {
  km: number;
  recCount: number;
  recLabel: string;
};

export function rankStaff(list: Professional[]) {
  return [...list].sort((a, b) => {
    if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
    if ((a.rank ?? 99) !== (b.rank ?? 99)) return (a.rank ?? 99) - (b.rank ?? 99);
    return b.rating * b.reviews - a.rating * a.reviews;
  });
}

export function peopleReviews(
  placeId: string,
  extra: Record<string, PlaceReview[]> | undefined,
): PlaceReview[] {
  const place = places.find((p) => p.id === placeId);
  return [...(extra?.[placeId] ?? []), ...(place?.reviewList ?? [])];
}

export function rankStaffByPeopleAndPlace(
  list: Professional[],
  origin?: Coord | null,
  extraReviews?: Record<string, PlaceReview[]>,
): RankedStaff[] {
  return list
    .map((pro) => {
      const place = placeOf(pro);
      const km = origin && place ? haversineKm(origin, place.coordinate) : (place?.distanceKm ?? 99);
      const recs = peopleReviews(pro.placeId, extraReviews);
      const recCount = Math.max(pro.reviews, recs.length);
      const peopleAvg = recs.length
        ? recs.reduce((sum, r) => sum + r.rating, 0) / recs.length
        : pro.rating;
      const rating = pro.rating * 0.55 + peopleAvg * 0.45;
      const score = (rating * Math.log10(recCount + 2)) / (1 + km * 0.32);
      const latest = recs[0];
      return {
        ...pro,
        km,
        recCount,
        recLabel: `${formatKm(km)} · ${recCount} opiniones`,
        quote: latest?.text ?? pro.quote,
        reviewer: latest ? latest.author : pro.reviewer,
        _score: score,
      };
    })
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...pro }) => pro);
}

export function resolveStaff(pro: Professional, photos: Record<string, string>): Professional {
  return { ...pro, photo: photos[pro.id] ?? pro.photo };
}

export function placeOf(pro: Professional): Place | undefined {
  return places.find((p) => p.id === pro.placeId);
}

export function isVetStaff(pro: Professional) {
  const kind = placeOf(pro)?.kind;
  return kind === 'vet' || kind === 'vet24';
}

export function isGroomStaff(pro: Professional) {
  return placeOf(pro)?.kind === 'grooming';
}
