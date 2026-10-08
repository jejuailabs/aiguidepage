"use client";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import type { Preferences } from "@/theme/preferences";
import {
  Gamepad2,
  Landmark,
  Moon,
  Search,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Sun,
} from "lucide-react";
import { halls, type HallId } from "@/data/halls";

const hallIcons = {
  ai: Landmark,
  prompts: Sparkles,
  tools: Shapes,
  games: Gamepad2,
};
const subscribeMode = (callback: () => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
export function Header({
  onSettings,
  onSearch,
  onLogin,
  onHall,
  onTheme,
  mode,
  activeHall = "ai",
  visibleHalls,
  brandLabel,
  brandHref = "#gallery",
  accountLabel,
  brandLogo,
  hallLabels,
  hallHref,
}: {
  onSettings: () => void;
  onSearch: () => void;
  onLogin: () => void;
  onHall: (id: HallId) => void;
  onTheme: () => void;
  mode: Preferences["mode"];
  activeHall?: HallId;
  visibleHalls?: HallId[];
  brandLabel?: string;
  brandHref?: string;
  accountLabel?: string;
  brandLogo?: string;
  hallLabels?: Partial<Record<HallId, string>>;
  hallHref?: (id: HallId) => string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const systemDark = useSyncExternalStore(
    subscribeMode,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
  const dark = mode === "dark" || (mode === "system" && systemDark);
  const navigation = (mobile = false) => (
    <nav
      className={mobile ? "mobile-nav" : "desktop-nav"}
      aria-label={t("shell.navigation")}
    >
      {halls
        .filter((hall) => !visibleHalls || visibleHalls.includes(hall.id))
        .map((hall) => {
          const Icon = hallIcons[hall.id];
          return (
            <Link
              key={hall.id}
              href={
                hallHref?.(hall.id) ||
                `/${locale}${hall.id === "ai" ? "" : `/${hall.id}`}`
              }
              className={hall.id === activeHall ? "active" : ""}
              aria-current={hall.id === activeHall ? "page" : undefined}
              onNavigate={(event) => {
                if (hall.id === activeHall) {
                  event.preventDefault();
                  onHall(hall.id);
                }
              }}
            >
              {mobile && <Icon size={21} strokeWidth={1.65} />}
              <span>{hallLabels?.[hall.id] || t(`halls.${hall.id}`)}</span>
            </Link>
          );
        })}
    </nav>
  );
  return (
    <>
      <a href="#gallery" className="skip-link">
        {t("shell.skip")}
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href={brandHref}>
            {brandLogo ? (
              <Image
                className="brand-logo"
                src={brandLogo}
                width={34}
                height={34}
                alt=""
                unoptimized
              />
            ) : (
              <Landmark size={31} strokeWidth={1.65} />
            )}
            <span>{brandLabel || t("shell.brand")}</span>
          </Link>
          {navigation()}
          <div className="header-actions">
            <button
              className="icon-button search-button"
              aria-label={t("shell.search")}
              onClick={onSearch}
            >
              <Search size={20} />
            </button>
            <button
              className="theme-switch"
              role="switch"
              aria-checked={dark}
              aria-label={t("shell.darkMode")}
              onClick={onTheme}
            >
              <Sun className="theme-sun" size={18} />
              <span className="switch-track">
                <span className="switch-thumb" />
              </span>
              <Moon className="theme-moon" size={16} />
            </button>
            <span className="header-divider" />
            <button
              className="settings-button"
              aria-label={t("shell.settings")}
              onClick={onSettings}
            >
              <SlidersHorizontal size={19} />
              <span>{t("shell.settings")}</span>
            </button>
            <button className="pill-button login-button" onClick={onLogin}>
              {accountLabel || t("shell.login")}
              <ArrowIcon />
            </button>
          </div>
        </div>
      </header>
      {navigation(true)}
    </>
  );
}
function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}
