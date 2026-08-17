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
