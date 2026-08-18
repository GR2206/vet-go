declare const __PETSGO_OWNER_AUTH_SECRET__: string | undefined;

function env(name: string) {
  if (typeof process === 'undefined') return '';
  return (process.env[name] ?? '').trim();
}

export function ownerAuthEmail(shopId: string) {
  return `${shopId}@owners.petsgo.app`;
}

export function ownerAuthPassword() {
  const injected =
    typeof __PETSGO_OWNER_AUTH_SECRET__ === 'string' ? __PETSGO_OWNER_AUTH_SECRET__.trim() : '';
  return injected || env('VITE_OWNER_AUTH_SECRET') || env('LIVE_SESSION_SECRET');
}
