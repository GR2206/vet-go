function readEnv(key: string) {
  if (typeof process !== 'undefined') {
    const v = process.env[key] ?? process.env[`EXPO_PUBLIC_${key}`] ?? process.env[`VITE_${key}`];
    if (v) return v.trim();
  }
  return '';
}

/** Base del panel owner-web (sin /api/...). Seguro para navegador y Vite. */
export function resolveLiveApiBase(): string {
  const custom = readEnv('LIVE_API_URL') || readEnv('EXPO_PUBLIC_LIVE_API_URL');
  if (custom) return custom.replace(/\/$/, '');

  try {
    if (typeof window !== 'undefined' && /:\d+\b/.test(window.location.origin)) {
      return window.location.origin;
    }
  } catch {
    /* React Native sin window */
  }

  return 'http://localhost:5173';
}

export function liveCatalogUrl() {
  return `${resolveLiveApiBase()}/api/live-catalog`;
}
