export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Hash local para demo en el dispositivo. No es un backend. */
export function hashPassword(email: string, password: string) {
  const input = `${normalizeEmail(email)}\u0000${password}`;
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const RESET_KEY = 'vetgo.reset.v1';
const RESET_TTL_MS = 15 * 60 * 1000;

export type ResetRequest = {
  email: string;
  code: string;
  expiresAt: number;
};

export function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isValidEmail(email: string) {
  const key = normalizeEmail(email);
  return key.includes('@') && key.includes('.');
}

export function validatePassword(password: string): { ok: true } | { ok: false; error: string } {
  if (password.length < 6) {
    return { ok: false, error: 'La contraseña necesita al menos 6 caracteres.' };
  }
  return { ok: true };
}

export function validatePasswordMatch(
  password: string,
  confirm: string,
): { ok: true } | { ok: false; error: string } {
  if (password !== confirm) {
    return { ok: false, error: 'Las contraseñas no coinciden.' };
  }
  return { ok: true };
}

export function createResetRequest(email: string): ResetRequest {
  return {
    email: normalizeEmail(email),
    code: generateResetCode(),
    expiresAt: Date.now() + RESET_TTL_MS,
  };
}

export function isResetExpired(req: ResetRequest) {
  return Date.now() > req.expiresAt;
}

export function resetStorageKey() {
  return RESET_KEY;
}

export function resetTtlMinutes() {
  return RESET_TTL_MS / 60_000;
}
