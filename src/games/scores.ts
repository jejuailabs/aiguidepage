"use client";
import { useSyncExternalStore } from "react";
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("aiguide-scores", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("aiguide-scores", callback);
  };
};
export function useBestScore(key: string) {
  const fullKey = `aiguide-score-${key}`;
  const best = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return Number(localStorage.getItem(fullKey)) || 0;
      } catch {
        return 0;
      }
    },
    () => 0,
  );
  return {
    best,
    save: (score: number, lower = false) => {
      if (!best || (lower ? score < best : score > best)) {
        try {
          localStorage.setItem(fullKey, String(score));
          window.dispatchEvent(new Event("aiguide-scores"));
        } catch {}
      }
    },
  };
}
