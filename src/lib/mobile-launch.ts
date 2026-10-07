import type { AiItem } from "@/data/ai";
export type MobilePlatform = "android" | "ios";
export function mobilePlatform(
  userAgent: string,
  platform: string,
  maxTouchPoints: number,
): MobilePlatform | null {
  if (/Android/i.test(userAgent)) return "android";
  if (
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (/Mac/i.test(platform) && maxTouchPoints > 1)
  )
    return "ios";
  return null;
}
export function mobileAppHref(
  item: AiItem,
  platform: MobilePlatform | null,
): string | null {
  if (!platform || !item.mobileApp) return null;
  if (platform === "ios") return item.mobileApp.iosUrl || null;
  const { androidPackage, androidUrl } = item.mobileApp;
  if (!androidPackage || !androidUrl) return null;
  const url = new URL(androidUrl);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=${androidPackage};S.browser_fallback_url=${encodeURIComponent(item.url)};end`;
}
