"use client";
import { useSyncExternalStore } from "react";
import { mobilePlatform } from "./mobile-launch";
const subscribe = () => () => {};
const read = () =>
  mobilePlatform(
    navigator.userAgent,
    navigator.platform,
    navigator.maxTouchPoints,
  );
export function useMobilePlatform() {
  return useSyncExternalStore(subscribe, read, () => null);
}
