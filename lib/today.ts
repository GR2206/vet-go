import type { Booking, Pet, WalkBooking } from '@/data/types';
import { places } from '@/data/mock';
import { DAY_MS, daysSince, daysUntil, esDateLabel, parseEsDate, startOfDay } from '@/lib/dates';
import { bestDealFor } from '@/lib/deals';
import type { Coord } from '@/lib/geo';
import { salonsWithCupos } from '@/lib/grooming';
import { clockHm, kmLabel, nearestSpot, outingCopy } from '@/lib/outing';
import { upcomingPendings } from '@/lib/pending';
import { lastCareAt, petWellbeing, vaccineDates } from '@/lib/wellbeing';
import type { WeatherNow } from '@/lib/weather';

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';
export type Season = 'summer' | 'autumn' | 'winter' | 'spring';

export type Insight = {
  id: string;
  emoji: string;
  title: string;
  text: string;
  to: string;
  tone: 'calm' | 'live' | 'alert';
  image?: string;
  place?: string;
  kicker?: string;
  coordinate?: { latitude: number; longitude: number };
  mapsMode?: 'place' | 'walk';
};

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const PART_LABEL: Record<DayPart, string> = {
  morning: 'mañana',
  afternoon: 'tarde',
  evening: 'anochecer',
  night: 'noche',
};

export function dayPart(now = Date.now()): DayPart {
  const h = new Date(now).getHours();
  if (h >= 21 || h < 6) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export function seasonOf(now = Date.now()): Season {
  const m = new Date(now).getMonth();
  if (m === 11 || m <= 1) return 'summer';
  if (m <= 4) return 'autumn';
  if (m <= 7) return 'winter';
  return 'spring';
}

export function livingGreeting(firstName: string, now = Date.now()) {
  const h = new Date(now).getHours();
  const hi = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return `${hi}, ${firstName}`;
}

export function livingQuestion(name: string, now = Date.now()) {
  const part = dayPart(now);
  const season = seasonOf(now);
  const d = new Date(now);
  const day = WEEKDAYS[d.getDay()];
  const weekend = d.getDay() === 0 || d.getDay() === 6;

  if (part === 'morning' && weekend) return `¿Qué hacen ${name} y vos este ${day.toLowerCase()}?`;
  if (part === 'morning' && season === 'winter') return `¿${name} sale cuando caliente un poco?`;
  if (part === 'morning' && season === 'summer') return `¿${name} ya tomó el aire fresco?`;
  if (part === 'morning') return `¿Qué necesita ${name} esta mañana?`;

  if (part === 'afternoon' && season === 'winter') return `¿Aprovechamos el sol con ${name}?`;
  if (part === 'afternoon' && season === 'summer') return `¿${name} tiene agua y sombra?`;
  if (part === 'afternoon' && weekend) return `¿Cómo sigue el ${day.toLowerCase()} de ${name}?`;
  if (part === 'afternoon') return `¿Qué necesita ${name} esta tarde?`;

  if (part === 'evening') return `¿Cerramos el día con ${name}?`;
  return `¿${name} ya está tranquilo?`;
}

export function todayStamp(now = Date.now()) {
  const d = new Date(now);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${PART_LABEL[dayPart(now)]}`;
}

export function todayInsights(
  pet: Pet | null | undefined,
  bookings: Booking[],
  walks: WalkBooking[],
  ctx: {
    origin?: Coord | null;
    weather?: WeatherNow | null;
    now?: number;
  } = {},
): Insight[] {
  const now = ctx.now ?? Date.now();
  const name = pet?.name ?? 'tu mascota';
  const part = dayPart(now);
  const season = seasonOf(now);
  const weekday = new Date(now).getDay();
  const weekend = weekday === 0 || weekday === 6;
  const wellbeing = petWellbeing(pet, bookings, now);
  const pendings = upcomingPendings(bookings, walks, [], now);
  const today0 = startOfDay(now);
  const out: Insight[] = [];
  const used = new Set<string>();

  const push = (item: Insight) => {
    if (used.has(item.id) || out.length >= 5) return;
    used.add(item.id);
    out.push(item);
  };

  const outing = outingCopy(now, ctx.weather);
  if (outing) {
    const spot = nearestSpot(ctx.origin);
    const sky = outing.sky ? ` · ${outing.sky}` : '';
    push({
      id: 'outing',
      emoji: outing.emoji,
      title: outing.title,
      text: `${outing.temp}°${sky} · ${clockHm(now)}`,
      place: `${spot.name} · ${kmLabel(spot.km)}`,
      to: 'maps:outing',
      tone: outing.ideal ? 'live' : 'calm',
      coordinate: spot.coordinate,
      mapsMode: 'walk',
    });
  }

  const nextToday = pendings.find((p) => startOfDay(p.at) === today0);
  if (nextToday) {
    const hours = (nextToday.at - now) / 3_600_000;
    push({
      id: `p-${nextToday.id}`,
      emoji: nextToday.kind === 'walk' ? '🐾' : '📅',
      title: nextToday.title,
      text:
        hours < 1
          ? `En menos de una hora · ${nextToday.when}`
          : hours < 3
            ? `En un rato · ${nextToday.when}`
            : `Hoy · ${nextToday.when}`,
      to: nextToday.to,
      tone: hours < 2 ? 'alert' : 'live',
    });
  }

  const lastBath = lastCareAt(bookings, 'bath', now) ?? parseEsDate(pet?.lastBath);
  const bathDays = lastBath != null ? daysSince(lastBath, now) : undefined;
  const salons = salonsWithCupos(bookings, now, ctx.origin);
  if (bathDays == null || bathDays >= 3) {
    const daysLine =
      bathDays == null
        ? '¿Hace cuánto no lo bañamos?'
        : bathDays === 1
          ? 'Hace 1 día de su último baño'
          : `Hace ${bathDays} días de su último baño`;
    const spotsLine =
      salons.length === 0
        ? 'Hoy no quedan turnos de baño cerca'
        : salons.length === 1
          ? `${salons[0].place.name} tiene ${salons[0].slots.length} turno${salons[0].slots.length === 1 ? '' : 's'} libre${salons[0].slots.length === 1 ? '' : 's'} hoy`
          : `${salons.length} peluquerías cerca tienen cupos hoy`;
    push({
      id: 'bath',
      emoji: '🛁',
      title: daysLine,
      text: spotsLine,
      place: salons[0] ? `${salons[0].place.name} · próximo ${salons[0].slots[0]}` : undefined,
      to: `/booking/${salons[0]?.place.id ?? 'luna'}`,
      tone: bathDays != null && bathDays >= 7 ? 'alert' : 'live',
    });
  }

  const deal = bestDealFor(pet, ctx.origin);
  if (deal) {
    push({
      id: 'deal',
      emoji: '🎁',
      title: `Encontramos algo para ${name}`,
      kicker: deal.kicker,
      text: deal.text,
      place: `${deal.shopName} · ${deal.nearby ? 'cerca' : 'lo más cerca'}`,
      to: deal.to,
      tone: 'live',
    });
  }

  const vax = vaccineDates(pet, bookings, now);
  if (vax.dueAt != null) {
    const left = daysUntil(vax.dueAt, now);
    if (left < 0 || left <= 30) {
      const lastLine =
        vax.lastAt != null
          ? `Última el ${esDateLabel(vax.lastAt)}`
          : 'Sin vacuna registrada';
      const dueLine =
        left < 0
          ? 'está vencida'
          : left === 0
            ? 'es hoy'
            : left === 1
              ? 'falta 1 día'
              : `faltan ${left} días`;
      push({
        id: 'vax',
        emoji: '💉',
        title: 'Vacuna antirrábica',
        text: `${lastLine} · ${dueLine}`,
        to: '/booking/san-martin',
        tone: left <= 3 ? 'alert' : 'live',
        image: placePhoto('san-martin'),
      });
    }
  }

  const petWalks = walks.filter((w) => !pet || w.petId === pet.id);
  const walkedToday = petWalks.some((w) => w.at < now && startOfDay(w.at) === today0);
  const lastWalk = petWalks.filter((w) => w.at < now).sort((a, b) => b.at - a.at)[0];
  if (!walkedToday && part !== 'night' && !used.has('outing')) {
    const gap = lastWalk ? daysSince(lastWalk.at, now) : undefined;
    push({
      id: 'walk',
      emoji: '🐾',
      title:
        gap != null && gap >= 2
          ? `Hace ${gap} días que no registramos un paseo`
          : `Paseo de ${name}`,
      text: '¿Salimos?',
      to: '/walkers',
      tone: gap != null && gap >= 7 ? 'alert' : 'live',
      image: pet?.photoUri,
    });
  }

  const later = pendings.find((p) => startOfDay(p.at) !== today0 && p.at - now < 7 * DAY_MS);
  if (later) {
    const days = Math.max(1, Math.ceil((startOfDay(later.at) - today0) / DAY_MS));
    push({
      id: `soon-${later.id}`,
      emoji: later.kind === 'walk' ? '🐾' : '📅',
      title: later.title,
      text: days === 1 ? `Mañana · ${later.when}` : `${WEEKDAYS[new Date(later.at).getDay()]} · ${later.when}`,
      to: later.to,
      tone: 'calm',
    });
  }

  if (!used.has('outing')) {
    push(momentCard(name, part, season, weekend, weekday, now));
  }

  if (!out.length) {
    push({
      id: 'ok',
      emoji: '💚',
      title: `${name} está bien`,
      text: wellbeing.headline,
      to: '/consult',
      tone: 'calm',
    });
  }

  return out;
}

export function todayCta(items: Insight[]) {
  return (
    items.find((i) => i.id === 'outing') ??
    items.find((i) => i.id === 'bath') ??
    items.find((i) => i.id === 'walk') ??
    items.find((i) => i.id === 'vax') ??
    items.find((i) => i.id.startsWith('p-')) ??
    items.find((i) => i.to.includes('/shop')) ??
    items[0]
  );
}

export function ctaLabel(item: Insight, name: string) {
  if (item.id === 'outing') return `IR CON ${name.toUpperCase()} →`;
  if (item.id === 'bath') return 'VER OPCIONES →';
  if (item.id === 'deal') return 'VER OFERTA →';
  if (item.id === 'vax') return 'RESERVAR →';
  if (item.id === 'walk') return 'SALIR →';
  if (item.id.startsWith('p-')) return 'VER TURNO →';
  if (item.to.includes('/shop')) return 'COMPRAR →';
  if (item.to.includes('/walkers')) return `IR CON ${name.toUpperCase()} →`;
  return 'VER →';
}

function placePhoto(id: string) {
  return places.find((p) => p.id === id)?.photoUri;
}

function momentCard(
  name: string,
  part: DayPart,
  season: Season,
  weekend: boolean,
  weekday: number,
  now: number,
): Insight {
  const id = `moment-${part}-${season}-${weekend ? 'we' : 'wd'}`;
  const tomorrow = WEEKDAYS[(weekday + 1) % 7];

  if (part === 'morning' && weekend && season === 'winter') {
    return {
      id,
      emoji: '🧣',
      title: `${WEEKDAYS[weekday]} frío`,
      text: `Salí con ${name} cuando suba un poco el sol.`,
      to: '/walkers',
      tone: 'live',
    };
  }
  if (part === 'morning' && weekend) {
    return {
      id,
      emoji: '🌤️',
      title: `${WEEKDAYS[weekday]} con ${name}`,
      text: 'Hay tiempo para un paseo más largo.',
      to: '/walkers',
      tone: 'live',
    };
  }
  if (part === 'morning' && season === 'summer') {
    return {
      id,
      emoji: '🌅',
      title: 'Salí temprano',
      text: `A mediodía el asfalto de Rosario quema. ${name} lo va a agradecer.`,
      to: '/walkers',
      tone: 'live',
    };
  }
  if (part === 'morning' && season === 'winter') {
    return {
      id,
      emoji: '🌫️',
      title: 'Mañana fría',
      text: `Paseo cortito para ${name}. Cuidado con la vereda helada.`,
      to: '/walkers',
      tone: 'live',
    };
  }
  if (part === 'morning') {
    return {
      id,
      emoji: '🌅',
      title: `Mañana para ${name}`,
      text: 'Un giro a la manzana antes de que arranque el día.',
      to: '/walkers',
      tone: 'live',
    };
  }

  if (part === 'afternoon' && season === 'summer') {
    return {
      id,
      emoji: '☀️',
      title: 'Hoy hace calor',
      text: `Recordá dejarle agua fresca a ${name}.`,
      to: '/shop/pichichos',
      tone: 'live',
      image: placePhoto('pichichos'),
    };
  }
  if (part === 'afternoon' && season === 'winter') {
    return {
      id,
      emoji: '☀️',
      title: 'La hora tibia',
      text: `Es el mejor momento del día para sacar a ${name}.`,
      to: '/walkers',
      tone: 'live',
    };
  }
  if (part === 'afternoon' && season === 'spring') {
    return {
      id,
      emoji: '🌼',
      title: 'Tarde de primavera',
      text: `Buen paseo. Al volver, revisale las patas a ${name}.`,
      to: '/walkers',
      tone: 'live',
    };
  }
  if (part === 'afternoon') {
    return {
      id,
      emoji: '🍂',
      title: 'Tarde para salir',
      text: `Buena hora para ${name}. El sol ya no pega tanto.`,
      to: '/walkers',
      tone: 'live',
    };
  }

  if (part === 'evening') {
    return {
      id,
      emoji: '🌇',
      title: 'Cierre del día',
      text: weekend
        ? `Último paseo de ${name} y a casa.`
        : `Un giro corto y a descansar. Mañana es ${tomorrow}.`,
      to: '/walkers',
      tone: 'calm',
    };
  }

  const h = new Date(now).getHours();
  return {
    id,
    emoji: '🌙',
    title: `${name} de noche`,
    text: h < 6 ? 'Todavía es de madrugada. Mañana seguimos.' : `Cierre suave. Mañana es ${tomorrow}.`,
    to: '/pending',
    tone: 'calm',
  };
}
