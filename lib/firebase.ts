import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

declare const __PETSGO_FIREBASE_CONFIG__: Partial<FirebaseWebConfig> | undefined;

function env(value: string | undefined) {
  return (value ?? '').trim();
}

function fromInjected(): FirebaseWebConfig | null {
  const raw = typeof __PETSGO_FIREBASE_CONFIG__ === 'undefined' ? null : __PETSGO_FIREBASE_CONFIG__;
  if (!raw?.apiKey || !raw.projectId || !raw.appId) return null;
  return {
    apiKey: env(raw.apiKey),
    authDomain: env(raw.authDomain),
    projectId: env(raw.projectId),
    storageBucket: env(raw.storageBucket),
    messagingSenderId: env(raw.messagingSenderId),
    appId: env(raw.appId),
  };
}

export function firebaseWebConfig(): FirebaseWebConfig {
  const injected = fromInjected();
  if (injected) return injected;
  return {
    apiKey: env(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
    authDomain: env(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: env(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: env(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: env(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: env(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
  };
}

export function isFirebaseConfigured(config = firebaseWebConfig()) {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getFirebaseApp() {
  const config = firebaseWebConfig();
  if (!isFirebaseConfigured(config)) return null;
  if (app) return app;
  app = getApps().length ? getApp() : initializeApp(config);
  return app;
}

export function getFirestoreDb() {
  if (db) return db;
  const instance = getFirebaseApp();
  if (!instance) return null;
  db = getFirestore(instance);
  return db;
}
