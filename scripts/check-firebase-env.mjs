import { readFileSync } from 'node:fs';

const text = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const keys = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const values = {};
for (const key of keys) {
  const match = text.match(new RegExp(`^${key}=(.*)$`, 'm'));
  const raw = (match?.[1] ?? '').trim().replace(/^['"]|['"]$/g, '');
  values[key] = raw;
  console.log(`${key}: ${raw ? `SET (${raw.length} chars)` : 'EMPTY'}`);
}

const projectId = values.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
if (!projectId) {
  process.exit(2);
}

const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/shops?pageSize=1`;
const res = await fetch(url);
const body = await res.text();
console.log(`FIRESTORE_HTTP: ${res.status}`);
if (res.status === 200) console.log('FIRESTORE: reachable');
else if (res.status === 403) console.log('FIRESTORE: project exists, rules or API may block list');
else if (res.status === 404) console.log('FIRESTORE: database missing or wrong project id');
else console.log(body.slice(0, 240));
