import type {DesktopPlatform} from '@/data/ai';

// Device classification only: a web page cannot inspect installed native apps.
export function desktopPlatform(userAgent: string, platform: string, maxTouchPoints: number): DesktopPlatform | null {
  if (/Android|iPhone|iPad|iPod|Mobile|CrOS/i.test(userAgent)) return null;
  if (/Mac/i.test(platform) && maxTouchPoints > 1) return null; // iPadOS desktop-style UA
  if (/Windows/i.test(userAgent) || /^Win/i.test(platform)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(userAgent) || /^Mac/i.test(platform)) return 'macos';
  if (/Linux/i.test(userAgent) || /^Linux/i.test(platform)) return 'linux';
  return null;
}
