"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveWorkspace } from "./live-workspace";
import { useLocale, useTranslations } from "next-intl";
import { signOut } from "firebase/auth";
import { Header } from "@/components/shell/header";
import { Settings } from "@/components/shell/settings";
import { Modal } from "@/components/shell/modal";
import { usePreferences } from "@/theme/use-preferences";
import { Link } from "@/i18n/navigation";
import { getBrowserAuth } from "@/lib/firebase/auth";
import { api } from "@/lib/client-api";
import {
  localize,
  type Hall,
  type HallKey,
  type Org,
  type Viewer,
  type PortalItem,
} from "@/lib/schema";

export function PortalShell({
  viewer,
  org,
  halls = [],
  active = "ai",
  admin = false,
  children,
}: {
  viewer: Viewer;
  org?: Org;
  halls?: Hall[];
  active?: HallKey;
  admin?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter(),
    t = useTranslations("portal"),
    locale = useLocale(),
    { preferences, update } = usePreferences();
  const [panel, setPanel] = useState<"settings" | "account" | "search" | null>(
      null,
    ),
    [query, setQuery] = useState(""),
    [groups, setGroups] = useState<{ hall: HallKey; items: PortalItem[] }[]>(
      [],
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const focus = useRef<HTMLElement | null>(null);
  const open = (value: typeof panel) => {
    focus.current = document.activeElement as HTMLElement;
    setPanel(value);
  };
  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!org) return;
    setBusy(true);
    setError(false);
    try {
      setGroups(
        (
          await api<{ groups: typeof groups }>(
            `/api/portal/orgs/${org.id}/search?q=${encodeURIComponent(query)}`,
          )
        ).groups,
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await api("/api/session", undefined, "DELETE");
      try {
        await signOut(getBrowserAuth());
      } catch {}
      router.replace(`/${locale}`);
      router.refresh();
    } catch {
      setError(true);
      setBusy(false);
    }
  }
  function savePreferences(patch: Partial<typeof preferences>) {
    update(patch);
    void api("/api/portal/me/prefs", {
      ...preferences,
      ...patch,
      locale,
    }).catch(() => setError(true));
  }
  return (
    <>
      <LiveWorkspace org={org} uid={viewer.uid} />
      <Header
        mode={preferences.mode}
        onSettings={() => open("settings")}
        onLogin={() => open("account")}
        onSearch={() => open("search")}
        onTheme={() =>
          savePreferences({
            mode:
              document.documentElement.dataset.mode === "dark"
                ? "light"
                : "dark",
          })
        }
        onHall={(key) => {
          if (org) router.push(`/${locale}/o/${org.id}/${key}`);
        }}
        activeHall={active}
        visibleHalls={halls.filter((h) => h.enabled).map((h) => h.key)}
        brandLogo={org?.logoUrl}
        hallLabels={Object.fromEntries(
          halls.map((h) => [h.key, localize(h.title, locale)]),
        )}
        brandLabel={org ? localize(org.name, locale) : t("brand")}
        brandHref={`/${locale}/orgs?choose=1`}
        accountLabel={t("myAccount")}
      />
      <main id="gallery" className="portal-main">
        {children}
      </main>
      <footer className="portal-footer">{t("privacy")}</footer>
      <Modal
        open={panel !== null}
        onClose={() => setPanel(null)}
        title={t(
          panel === "settings"
            ? "settings"
            : panel === "search"
              ? "search"
              : "myAccount",
        )}
        description={t("workspace")}
        returnFocus={focus}
        className="settings-panel"
      >
        {panel === "settings" ? (
          <Settings
            preferences={preferences}
            locales={org?.locales}
            onLocaleChange={(nextLocale) => {
              void api("/api/portal/me/prefs", {
                ...preferences,
                locale: nextLocale,
              }).catch(() => setError(true));
            }}
            update={savePreferences}
          />
        ) : panel === "account" ? (
          <div className="account-menu">
            <span className="eyebrow">{t("workspace")}</span>
            <h2>{viewer.name}</h2>
            <p>{viewer.email}</p>
            <Link href="/orgs?choose=1">{t("switchOrg")}</Link>
            <Link href="/join">{t("joinAnother")}</Link>
            <Link href="/me">{t("favorites")}</Link>
            {org && admin && (
              <Link href={`/o/${org.id}/admin`}>{t("manageOrg")}</Link>
            )}
            {viewer.platformAdmin && (
              <><Link href="/admin">{t('aiAdmin')}</Link><Link href="/platform">{t("platform")}</Link></>
            )}
            <button className="outline-button" disabled={busy} onClick={logout}>
              {t("logout")}
            </button>
            {error && <p role="alert">{t("errors.unavailable")}</p>}
          </div>
        ) : (
          <div className="account-menu">
            <h2>{t("search")}</h2>
            {org ? (
              <>
                <form onSubmit={search} className="inline-form">
                  <input
                    aria-label={t("search")}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    required
                  />
                  <button className="pill-button" disabled={busy}>
                    {t(busy ? "working" : "search")}
                  </button>
                </form>
                {error && <p role="alert">{t("errors.unavailable")}</p>}
                {groups.map((group) => (
                  <section key={group.hall}>
                    <h3>{t(`hall.${group.hall}`)}</h3>
                    {group.items.map((item) => (
                      <Link
                        key={`${item.scope}:${item.id}`}
                        href={`/o/${org.id}/${group.hall}?item=${item.scope}:${item.id}`}
                      >
                        {localize(item.title, locale)}
                      </Link>
                    ))}
                  </section>
                ))}
                {!busy && !groups.length && <p>{t("searchHint")}</p>}
              </>
            ) : (
              <p>{t("chooseOrg")}</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
