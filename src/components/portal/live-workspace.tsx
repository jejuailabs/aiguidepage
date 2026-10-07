"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getFirestore,
  onSnapshot,
} from "firebase/firestore";
import { getBrowserAuth } from "@/lib/firebase/auth";
import { api } from "@/lib/client-api";
import { usePreferences } from "@/theme/use-preferences";
import type { Preferences } from "@/theme/preferences";
import type { Org } from "@/lib/schema";
let connected = false;
export function LiveWorkspace({ org, uid }: { org?: Org; uid: string }) {
  const router = useRouter(),
    { update } = usePreferences();
  const orgId = org?.id,
    palette = org?.theme.palette,
    mode = org?.theme.mode;
  useEffect(() => {
    let cancelled = false;
    void api<{ prefs: Preferences | null }>("/api/portal/me")
      .then(({ prefs }) => {
        if (!cancelled)
          update(
            prefs || { palette: palette || "gallery", mode: mode || "system" },
          );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [uid, orgId, palette, mode, update]);
  useEffect(() => {
    if (!orgId) return;
    let stops: (() => void)[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    // Firestore subscriptions update menus and revoke an open hall when an admin changes access.
    const stopAuth = onAuthStateChanged(getBrowserAuth(), (user) => {
      stops.forEach((stop) => stop());
      stops = [];
      if (!user) return;
      const db = getFirestore(getBrowserAuth().app);
      if (
        process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" &&
        !connected &&
        ["localhost", "127.0.0.1"].includes(location.hostname)
      ) {
        connectFirestoreEmulator(db, "127.0.0.1", 8080);
        connected = true;
      }
      for (const ref of [
        collection(db, "orgs", orgId, "halls"),
        doc(db, "orgs", orgId),
        doc(db, "orgs", orgId, "members", uid),
      ]) {
        let initial = true;
        const next = () => {
          if (initial) {
            initial = false;
            return;
          }
          refresh();
        };
        stops.push(
          ref.type === "collection"
            ? onSnapshot(ref, next, refresh)
            : onSnapshot(ref, next, refresh),
        );
      }
    });
    document.addEventListener("visibilitychange", visible);
    // A restored HttpOnly session may outlive browser Auth persistence.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30000);
    return () => {
      stopAuth();
      stops.forEach((stop) => stop());
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [orgId, uid, router]);
  return null;
}
