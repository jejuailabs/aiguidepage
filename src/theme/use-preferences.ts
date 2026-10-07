'use client';
import {useEffect, useMemo, useSyncExternalStore} from 'react';
import {defaultSnapshot, parsePreferences, preferenceKey, type Preferences} from './preferences';
const subscribe = (callback: () => void) => {
  const onStorage = (event: StorageEvent) => {if (event.key === preferenceKey || event.key === null) {memory = null; callback();}};
  window.addEventListener('storage', onStorage);
  window.addEventListener('gallery-preferences', callback);
  return () => {window.removeEventListener('storage', onStorage); window.removeEventListener('gallery-preferences', callback);};
};
let memory: string | null = null;
const getSnapshot = () => {try {return memory ?? localStorage.getItem(preferenceKey) ?? defaultSnapshot;} catch {return memory ?? defaultSnapshot;}};
export function usePreferences() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => defaultSnapshot);
  const preferences = useMemo(() => parsePreferences(snapshot), [snapshot]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.mode = preferences.mode === 'dark' || (preferences.mode === 'system' && media.matches) ? 'dark' : 'light';
      document.documentElement.dataset.palette = preferences.palette;
      document.documentElement.dataset.scale = preferences.scale;
    };
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preferences]);
  const update = (patch: Partial<Preferences>) => {
    const next = JSON.stringify({...parsePreferences(getSnapshot()), ...patch});
    memory = next;
    try {localStorage.setItem(preferenceKey, next);} catch {}
    window.dispatchEvent(new Event('gallery-preferences'));
  };
  return {preferences, update};
}
