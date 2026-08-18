import Constants from 'expo-constants';

function readEnv(key: string) {
  if (typeof process !== 'undefined') {
    const v = process.env[key] ?? process.env[`EXPO_PUBLIC_${key}`] ?? process.env[`VITE_${key}`];
    if (v) return v.trim();
  }
  return '';
}

function debuggerHost() {
  const go = Constants.expoGoConfig as { debuggerHost?: string } | undefined;
  if (go?.debuggerHost) return go.debuggerHost;
  const manifest2 = Constants.manifest2 as
    | { extra?: { expoGo?: { debuggerHost?: string } } }
    | undefined;
  return manifest2?.extra?.expoGo?.debuggerHost;
}

/** Versión app móvil: detecta IP LAN del dev server cuando no hay URL custom. */
export function resolveLiveApiBase(): string {
  const custom = readEnv('LIVE_API_URL') || readEnv('EXPO_PUBLIC_LIVE_API_URL');
  if (custom) return custom.replace(/\/$/, '');

  const hostPort = debuggerHost();
  if (hostPort) {
    const host = hostPort.split(':')[0] ?? '';
    const isLan = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    if (isLan) return `http://${host}:5173`;
  }

  return 'http://localhost:5173';
}

export function liveCatalogUrl() {
  return `${resolveLiveApiBase()}/api/live-catalog`;
}
