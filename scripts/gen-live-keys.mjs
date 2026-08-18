import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const envPath = new URL('../.env', import.meta.url);
const examplePath = new URL('../.env.example', import.meta.url);

function key() {
  return randomBytes(32).toString('base64url');
}

function upsert(text, name, value) {
  const line = `${name}=${value}`;
  const re = new RegExp(`^${name}=.*$`, 'm');
  if (re.test(text)) return text.replace(re, line);
  return `${text.trimEnd()}\n${line}\n`;
}

if (!existsSync(envPath)) {
  writeFileSync(envPath, readFileSync(examplePath, 'utf8'), 'utf8');
}

let text = readFileSync(envPath, 'utf8');
const session = key();
const app = key();

if (!/^LIVE_SESSION_SECRET=.+$/m.test(text)) text = upsert(text, 'LIVE_SESSION_SECRET', session);
if (!/^LIVE_APP_WRITE_KEY=.+$/m.test(text)) text = upsert(text, 'LIVE_APP_WRITE_KEY', app);
if (!/^EXPO_PUBLIC_LIVE_APP_WRITE_KEY=.+$/m.test(text)) {
  text = upsert(text, 'EXPO_PUBLIC_LIVE_APP_WRITE_KEY', app);
}

writeFileSync(envPath, text, 'utf8');
console.log('Claves LIVE generadas/verificadas en .env');
console.log('Reiniciá owner-web y Expo para tomar EXPO_PUBLIC_LIVE_APP_WRITE_KEY.');
