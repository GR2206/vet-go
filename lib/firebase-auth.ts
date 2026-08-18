import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';

import { getFirebaseApp, isFirebaseConfigured } from './firebase';
import { ownerAuthEmail, ownerAuthPassword } from './owner-auth';

let auth: Auth | null = null;
let ready: Promise<User | null> | null = null;

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!auth) auth = getAuth(app);
  return auth;
}

function waitForUser(instance: Auth) {
  if (instance.currentUser) return Promise.resolve(instance.currentUser);
  return new Promise<User | null>((resolve) => {
    const unsub = onAuthStateChanged(instance, (user) => {
      unsub();
      resolve(user);
    });
  });
}

export async function ensureTutorSignedIn() {
  if (!isFirebaseConfigured()) return null;
  const instance = getFirebaseAuth();
  if (!instance) return null;
  ready ??= (async () => {
    const existing = await waitForUser(instance);
    if (existing && !existing.email) return existing;
    const cred = await signInAnonymously(instance);
    return cred.user;
  })();
  try {
    return await ready;
  } catch (err) {
    ready = null;
    console.warn('[PETS&GO] Firebase tutor auth failed', err);
    return null;
  }
}

export async function ensureOwnerSignedIn(shopId: string) {
  if (!isFirebaseConfigured()) return null;
  const instance = getFirebaseAuth();
  const password = ownerAuthPassword();
  if (!instance || !password) {
    console.warn('[PETS&GO] Falta LIVE_SESSION_SECRET / VITE_OWNER_AUTH_SECRET para el dueño.');
    return null;
  }
  const email = ownerAuthEmail(shopId);
  if (instance.currentUser?.email === email) return instance.currentUser;
  try {
    const cred = await signInWithEmailAndPassword(instance, email, password);
    return cred.user;
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
      try {
        const created = await createUserWithEmailAndPassword(instance, email, password);
        return created.user;
      } catch (createErr) {
        const createCode = (createErr as { code?: string }).code ?? '';
        if (createCode === 'auth/email-already-in-use') {
          try {
            const cred = await signInWithEmailAndPassword(instance, email, password);
            return cred.user;
          } catch (retryErr) {
            console.warn('[PETS&GO] Firebase owner auth failed', retryErr);
            return null;
          }
        }
        console.warn('[PETS&GO] Firebase owner auth failed', createErr);
        return null;
      }
    }
    console.warn('[PETS&GO] Firebase owner auth failed', err);
    return null;
  }
}

export async function signOutFirebase() {
  const instance = getFirebaseAuth();
  if (!instance) return;
  try {
    await signOut(instance);
  } catch {
    /* already out */
  }
}

export function firebaseUid() {
  return getFirebaseAuth()?.currentUser?.uid ?? '';
}
