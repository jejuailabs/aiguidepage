import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deleteApp} from 'firebase-admin/app';
import {getFirebaseAdminApp} from '../src/lib/firebase/admin.ts';
test('partial emulator settings and real project IDs cannot mix with cloud credentials',async()=>{
  const keys=['GCLOUD_PROJECT','FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST'];
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  try {
    process.env.GCLOUD_PROJECT='demo-isolation';process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    assert.throws(()=>getFirebaseAdminApp(),/both emulators/);
    delete process.env.FIRESTORE_EMULATOR_HOST;process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';
    assert.throws(()=>getFirebaseAdminApp(),/both emulators/);
    process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';process.env.GCLOUD_PROJECT='a-real-project';
    assert.throws(()=>getFirebaseAdminApp(),/isolated demo project/);
    process.env.GCLOUD_PROJECT='demo-isolation';const app=getFirebaseAdminApp();assert.equal(app.options.projectId,'demo-isolation');await deleteApp(app);
  } finally {for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
});
