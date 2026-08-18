/** Validación compartida (cliente + servidor). Sin secretos acá. */

export const OWNER_ACTIONS = ['publish', 'dismiss', 'confirm_order', 'chat_reply', 'archive_order', 'rate_buyer'] as const;
export const APP_ACTIONS = ['order', 'deduct', 'ask', 'receive_order', 'rate_order', 'chat', 'cancel_order'] as const;

export type LiveAction = (typeof OWNER_ACTIONS)[number] | (typeof APP_ACTIONS)[number];

export function isOwnerAction(action: string): action is (typeof OWNER_ACTIONS)[number] {
  return (OWNER_ACTIONS as readonly string[]).includes(action);
}

export function isAppAction(action: string): action is (typeof APP_ACTIONS)[number] {
  return (APP_ACTIONS as readonly string[]).includes(action);
}

export function sanitizeId(raw: unknown, max = 80): string {
  return String(raw ?? '')
    .replace(/[^\w.-]/g, '')
    .slice(0, max);
}

export function sanitizeText(raw: unknown, max = 400): string {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
}

export function sanitizeOrderRating(raw: unknown): { rating: number; text: string; at: number } | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const rating = clampInt(o.rating, 1, 5, 0);
  if (rating < 1) return undefined;
  return {
    rating,
    text: sanitizeText(o.text, 400),
    at: clampInt(o.at, 0, 9_999_999_999_999, Date.now()),
  };
}

export function clampInt(raw: unknown, min: number, max: number, fallback = 0): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function liveAppWriteKeyFromEnv(get: (name: string) => string | undefined) {
  return (
    get('EXPO_PUBLIC_LIVE_APP_WRITE_KEY') ||
    get('LIVE_APP_WRITE_KEY') ||
    get('VITE_LIVE_APP_WRITE_KEY') ||
    ''
  ).trim();
}

export function liveSessionSecretFromEnv(get: (name: string) => string | undefined) {
  return (get('LIVE_SESSION_SECRET') || get('LIVE_APP_WRITE_KEY') || '').trim();
}
