"use client";
import type { MediaAsset } from "./media";
export async function downloadMedia(asset: MediaAsset) {
  const response = await fetch(asset.url);
  if (!response.ok) throw new Error("downloadFailed");
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = asset.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
