import {test, expect} from '@playwright/test';
import {deleteApp, getApps} from 'firebase/app';
import {getFirebaseApp, initializeFirebaseClient} from '../src/lib/firebase/client';

const config = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'test-public-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'example',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:123:web:example'
};

test('Firebase stays inactive during server rendering', async () => {
  expect(getFirebaseApp()).toBeNull();
  await initializeFirebaseClient();
  expect(getApps()).toHaveLength(0);
});

test('missing browser config is safe, and repeated initialization reuses one app', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalEnv = Object.fromEntries(Object.keys(config).map(key => [key, process.env[key]]));
  Object.defineProperty(globalThis, 'window', {value: {}, configurable: true});
  try {
    Object.assign(process.env, config);
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    expect(getFirebaseApp()).toBeNull();
    expect(getApps()).toHaveLength(0);

    Object.assign(process.env, config);
    const first = getFirebaseApp();
    expect(first?.options.projectId).toBe('example');
    expect(getFirebaseApp()).toBe(first);
    expect(getApps()).toHaveLength(1);
    const initialization = initializeFirebaseClient();
    expect(initializeFirebaseClient()).toBe(initialization);
    await initialization;
  } finally {
    await Promise.all(getApps().map(app => deleteApp(app)));
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
