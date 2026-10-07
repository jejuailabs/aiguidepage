'use client';

import {getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions} from 'firebase/app';

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;

  // Keep literal process.env references so Next.js can inline browser settings.
  const config: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) return null;

  return getApps().some(app => app.name === '[DEFAULT]') ? getApp() : initializeApp(config);
}

let initialization: Promise<void> | undefined;

export function initializeFirebaseClient(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  // Share the promise across React Strict Mode effects and locale navigation.
  return initialization ??= startFirebaseClient().catch(() => {
    console.warn('Firebase initialization was unavailable. The gallery remains usable.');
  });
}

async function startFirebaseClient(): Promise<void> {
  const app = getFirebaseApp();
  if (!app || process.env.NODE_ENV !== 'production' || !app.options.measurementId) return;

  const {getAnalytics, isSupported} = await import('firebase/analytics');
  if (await isSupported()) getAnalytics(app);
}
