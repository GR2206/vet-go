import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

import { createLiveCatalogMiddleware } from './server/live-catalog-handler';

const data = fileURLToPath(new URL('../data', import.meta.url));
const lib = fileURLToPath(new URL('../lib', import.meta.url));
const liveFile = fileURLToPath(new URL('../data/live-catalog.json', import.meta.url));

function liveCatalogPlugin(env: Record<string, string>, isSecure: boolean): Plugin {
  const getEnv = (key: string) => env[key] ?? process.env[key];
  const handler = createLiveCatalogMiddleware({ liveFile, getEnv, isSecure });
  return {
    name: 'live-catalog-secure',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handler(req, res, next);
      });
    },
  };
}

const ownerRoot = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const firebaseRoot = fileURLToPath(new URL('./node_modules/firebase', import.meta.url));
const FIREBASE_KEYS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
] as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, ['EXPO_PUBLIC_', 'VITE_', 'LIVE_']);
  for (const [key, value] of Object.entries(env)) {
    if (value && !process.env[key]) process.env[key] = value;
  }
  const firebaseInjected = {
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY || '',
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId:
      env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID || env.VITE_FIREBASE_APP_ID || '',
  };
  const firebaseDefine = Object.fromEntries(
    FIREBASE_KEYS.map((key) => [
      `process.env.EXPO_PUBLIC_${key}`,
      JSON.stringify(env[`EXPO_PUBLIC_${key}`] || env[`VITE_${key}`] || ''),
    ]),
  );

  return {
    root: ownerRoot,
    envDir: repoRoot,
    envPrefix: ['VITE_', 'EXPO_PUBLIC_', 'LIVE_'],
    define: {
      ...firebaseDefine,
      __PETSGO_FIREBASE_CONFIG__: JSON.stringify(firebaseInjected),
    },
    plugins: [react(), liveCatalogPlugin(env, false)],
    resolve: {
      alias: {
        '@petsgo/data': data,
        '@petsgo/lib': lib,
        firebase: firebaseRoot,
      },
    },
    optimizeDeps: {
      include: ['firebase/app', 'firebase/firestore'],
    },
    build: {
      outDir: fileURLToPath(new URL('./dist', import.meta.url)),
      emptyOutDir: true,
      sourcemap: false,
    },
    preview: {
      port: 4173,
      host: true,
    },
    server: {
      port: 5173,
      open: true,
      host: true,
      fs: { allow: [repoRoot] },
    },
  };
});
