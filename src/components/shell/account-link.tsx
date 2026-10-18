"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";

export function AccountLink({ signedIn }: { signedIn?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations();
  const [authenticated, setAuthenticated] = useState(signedIn ?? false);

  useEffect(() => {
    if (signedIn !== undefined) return;
    const controller = new AbortController();
    void fetch("/api/session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.ok) setAuthenticated(!!(await response.json()).viewer);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [signedIn, pathname]);

  const loggedIn = signedIn ?? authenticated;
  return (
    <Link
      className="pill-button login-button"
      href={
        loggedIn
          ? `/${locale}/me`
          : `/${locale}/login?next=${encodeURIComponent(pathname)}`
      }
    >
      <UserRound className="account-icon" size={20} aria-hidden="true" />
      <span className="account-label">{t(loggedIn ? "portal.myAccount" : "shell.login")}</span>
    </Link>
  );
}
