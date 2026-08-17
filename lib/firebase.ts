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

function read(key: string) {
  const fromProcess =
    (typeof process !== 'undefined' && (process.env[`EXPO_PUBLIC_${key}`] || process.env[`VITE_${key}`])) || '';
  return fromProcess.trim();
}

export function firebaseWebConfig(): FirebaseWebConfig {
  return {
    apiKey: read('FIREBASE_API_KEY'),
    authDomain: read('FIREBASE_AUTH_DOMAIN'),
    projectId: read('FIREBASE_PROJECT_ID'),
    storageBucket: read('FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: read('FIREBASE_MESSAGING_SENDER_ID'),
    appId: read('FIREBASE_APP_ID'),
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
