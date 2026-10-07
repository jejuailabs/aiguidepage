import 'server-only';

import {cert, getApps, initializeApp, type App} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';

const appName = 'aiguide-admin';

export function getFirebaseAdminApp(): App {
  const existing = getApps().find(app => app.name === appName);
  if (existing) return existing;

  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    const projectId=process.env.GCLOUD_PROJECT;
    if(!projectId?.startsWith('demo-')||!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST)throw new Error('Emulator tests require both emulators and an isolated demo project.');
    return initializeApp({projectId},appName);
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin requires FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY.');
  }

  let credential;
  try {
    credential = cert({projectId, clientEmail, privateKey});
  } catch {
    // SDK errors must not disclose the supplied credential or PEM contents.
    throw new Error('Firebase Admin credentials are invalid. Check the server environment variables and PEM format.');
  }

  return initializeApp({projectId, credential}, appName);
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminFirestore() {
  return getFirestore(getFirebaseAdminApp());
}
