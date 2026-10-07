'use client';

import {useEffect} from 'react';

export function FirebaseBootstrap() {
  useEffect(() => {
    void import('@/lib/firebase/client')
      .then(({initializeFirebaseClient}) => initializeFirebaseClient())
      .catch(() => console.warn('Firebase could not be loaded. The gallery remains usable.'));
  }, []);

  return null;
}
