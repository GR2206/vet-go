import type { UserProfile } from '@/data/types';

/** Clave estable para identificar al tutor en chats (misma en envío y lectura). */
export function chatTutorKey(user: UserProfile | null | undefined, fallback = 'tutor') {
  const email = user?.email?.trim().toLowerCase();
  if (email && email.includes('@')) return email;
  const name = user?.name?.trim().toLowerCase();
  if (name) return name.replace(/\s+/g, '-');
  return fallback.trim().toLowerCase() || 'tutor';
}
