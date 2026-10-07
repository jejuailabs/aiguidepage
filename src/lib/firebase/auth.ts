'use client';
import {connectAuthEmulator,getAuth} from 'firebase/auth';
import {getFirebaseApp} from './client';
let connected=false;
export function getBrowserAuth() {
  const app=getFirebaseApp();if(!app)throw new Error('notReady');
  const auth=getAuth(app);
  if(process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS==='true'&&!connected&&['localhost','127.0.0.1'].includes(window.location.hostname)) {
    connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connected=true;
  }
  return auth;
}
