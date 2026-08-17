export function responseSpeedLabel(mins: number) {
  if (mins <= 20) return 'Responde en minutos';
  if (mins <= 60) return 'Suele responder en menos de 1 hora';
  if (mins <= 180) return 'Suele responder en pocas horas';
  return 'Suele responder en el día';
}

export function normalizeQuery(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function matchesQuery(haystack: string, query: string) {
  const q = normalizeQuery(query);
  if (!q) return true;
  return normalizeQuery(haystack).includes(q);
}
