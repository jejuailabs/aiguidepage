import { shareSiteUrl } from "@/lib/site-url";
export function GET(request: Request) {
  const locale =
    new URL(request.url).searchParams.get("locale") === "en" ? "en" : "ko";
  return new Response(`[InternetShortcut]\r\nURL=${shareSiteUrl(locale)}\r\n`, {
    headers: {
      "Content-Type": "application/internet-shortcut; charset=utf-8",
      "Content-Disposition": `attachment; filename="AI-gallery.url"; filename*=UTF-8''${encodeURIComponent(locale === "ko" ? "AI 전시관.url" : "AI Gallery.url")}`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
