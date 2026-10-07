import {deleteApp} from 'firebase-admin/app';
import {getFirebaseAdminApp} from '../src/lib/firebase/admin.ts';

let app;
try {
  app = getFirebaseAdminApp();
  await app.options.credential.getAccessToken();
  console.log('Firebase Admin: Google token authentication succeeded. No user or database data was accessed.');
} catch {
  console.error('Firebase Admin authentication failed. Check server environment variables, key validity, and network access. Credentials and tokens are not printed.');
  process.exitCode = 1;
} finally {
  if (app) await deleteApp(app);
}
