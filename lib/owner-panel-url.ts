function readEnv(key: string) {
  if (typeof process === 'undefined') return '';
  return (process.env[key] ?? process.env[`EXPO_PUBLIC_${key}`] ?? '').trim();
}

export function ownerPanelUrl() {
  const custom = readEnv('OWNER_PANEL_URL') || readEnv('EXPO_PUBLIC_OWNER_PANEL_URL');
  if (custom) return custom.replace(/\/$/, '');
  return 'https://petsgo-e8c6d.web.app';
}
