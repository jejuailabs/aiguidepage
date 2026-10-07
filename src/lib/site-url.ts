export function shareSiteUrl(locale: string) {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || "https://aiguidepage.vercel.app";
  return new URL(`/${locale === "en" ? "en" : "ko"}`, origin).href;
}
