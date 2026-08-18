import { createHmac, timingSafeEqual } from 'node:crypto';

import { liveSessionSecretFromEnv } from '../../lib/live-catalog-security';

const SESSION_MS = 8 * 60 * 60 * 1000;

type SessionPayload = { shopId: string; exp: number };

function secret(getEnv: (k: string) => string | undefined) {
  const value = liveSessionSecretFromEnv(getEnv);
  if (!value) return 'petsgo-dev-insecure-set-LIVE_SESSION_SECRET';
  return value;
}

export function signOwnerSession(shopId: string, getEnv: (k: string) => string | undefined) {
  const payload: SessionPayload = { shopId, exp: Date.now() + SESSION_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret(getEnv)).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyOwnerSession(
  token: string | undefined,
  getEnv: (k: string) => string | undefined,
): SessionPayload | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', secret(getEnv)).update(body).digest('base64url');
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload?.shopId || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookie(header: string | undefined, name: string) {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

const buckets = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const hit = buckets.get(key);
  if (!hit || now > hit.reset) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  if (hit.n >= max) return { ok: false, remaining: 0 };
  hit.n += 1;
  return { ok: true, remaining: max - hit.n };
}

export function clientIp(req: { socket?: { remoteAddress?: string }; headers?: Record<string, unknown> }) {
  const fwd = req.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0]?.trim() || 'unknown';
  return req.socket?.remoteAddress || 'unknown';
}

export const SESSION_COOKIE = 'petsgo_owner_session';

export function sessionCookieHeader(token: string, secure: boolean) {
  const flags = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_MS / 1000)}`,
  ];
  if (secure) flags.push('Secure');
  return flags.join('; ');
}

export function clearSessionCookie(secure: boolean) {
  const flags = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (secure) flags.push('Secure');
  return flags.join('; ');
}
