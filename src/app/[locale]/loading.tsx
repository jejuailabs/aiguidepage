"use client";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Landmark } from "lucide-react";

export default function Loading() {
  const t = useTranslations("shell"),
    locale = useLocale();
  return (
    <main className="route-loading" aria-busy="true">
      <Link href={`/${locale}`} className="brand">
        <Landmark size={31} />
        {t("brand")}
      </Link>
      <div className="route-loading-line" aria-hidden="true" />
      <p role="status">{t("loading")}</p>
      <div className="route-loading-cards" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} />
        ))}
      </div>
    </main>
  );
}
