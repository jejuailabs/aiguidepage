import {test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {deleteApp, getApps} from 'firebase-admin/app';
import {getFirebaseAdminApp, getFirebaseAdminAuth, getFirebaseAdminFirestore} from '../src/lib/firebase/admin.ts';

const keys = ['FIREBASE_ADMIN_PROJECT_ID', 'FIREBASE_ADMIN_CLIENT_EMAIL', 'FIREBASE_ADMIN_PRIVATE_KEY'];
let saved;
const {privateKey} = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
  publicKeyEncoding: {type: 'spki', format: 'pem'}
});

beforeEach(() => {
  saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
});
afterEach(async () => {
  await Promise.all(getApps().filter(app => app.name === 'aiguide-admin').map(app => deleteApp(app)));
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('import is lazy and missing server settings fail only on use', () => {
  assert.equal(getApps().length, 0);
  assert.throws(() => getFirebaseAdminApp(), /Firebase Admin requires FIREBASE_ADMIN_PROJECT_ID/);
});

test('malformed credentials produce a sanitized error', () => {
  process.env.FIREBASE_ADMIN_PROJECT_ID = 'test-project';
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL = 'test@example.iam.gserviceaccount.com';
  process.env.FIREBASE_ADMIN_PRIVATE_KEY = 'do-not-echo-this-test-value';
  assert.throws(() => getFirebaseAdminApp(), error => {
    assert.equal(error.message, 'Firebase Admin credentials are invalid. Check the server environment variables and PEM format.');
    return true;
  });
});

test('PEM newline formats work and repeated calls share app and services', async () => {
  process.env.FIREBASE_ADMIN_PROJECT_ID = 'test-project';
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL = 'test@example.iam.gserviceaccount.com';
  for (const pem of [privateKey, privateKey.replace(/\n/g, '\\n'), privateKey.replace(/\n/g, '\r\n')]) {
    process.env.FIREBASE_ADMIN_PRIVATE_KEY = pem;
    const app = getFirebaseAdminApp();
    assert.equal(getFirebaseAdminApp(), app);
    assert.equal(getFirebaseAdminAuth().app, app);
    assert.equal(getFirebaseAdminFirestore(), getFirebaseAdminFirestore());
    await deleteApp(app);
  }
});

test('server-only rejects an ordinary client-side import', () => {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', "await import('./src/lib/firebase/admin.ts')"], {encoding: 'utf8'});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /cannot be imported from a Client Component/);
});
