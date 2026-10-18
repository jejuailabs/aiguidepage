"use client";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { Star } from "lucide-react";
import { PortalShell } from "./portal-shell";
import { OrganizationSection } from "./org-picker";
import { Link } from "@/i18n/navigation";
import { localize, type Org, type PortalItem, type Viewer } from "@/lib/schema";
import { api } from "@/lib/client-api";
import { getBrowserAuth } from "@/lib/firebase/auth";
export function Profile({
  viewer,
  favorites,
  orgs,
}: {
  viewer: Viewer;
  orgs: Org[];
  favorites: {
    key: string;
    orgId: string;
    hall: string;
    scope: string;
    itemId: string;
    item: PortalItem;
  }[];
}) {
  const locale = useLocale(),
    t = useTranslations("portal");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function logout() {
    setBusy(true);
    setError(false);
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
  return (
    <PortalShell viewer={viewer}>
      <section className="portal-intro">
        <div>
          <span className="eyebrow">{viewer.email}</span>
          <h1>{t("myAccount")}</h1>
          <p>{t("profileDescription", { name: viewer.name })}</p>
        </div>
        <button className="outline-button" onClick={logout} disabled={busy}>
          {t("logout")}
        </button>
      </section>
      {error && (
        <p className="notice error" role="alert">
          {t("errors.unavailable")}
        </p>
      )}
      <div className="profile-links">
        <Link className="pill-button" href="/">
          {t("browse")}
        </Link>
        <Link className="outline-button" href="/prompts">
          {t("hall.prompts")}
        </Link>
        {viewer.platformAdmin && (
          <Link className="outline-button" href="/admin">
            {t("aiAdmin")}
          </Link>
        )}
      </div>
      <section className="profile-section" aria-labelledby="favorites-title">
        <div className="portal-intro">
          <div>
            <h2 id="favorites-title">{t("favorites")}</h2>
            <p>{t("favoritesDescription")}</p>
          </div>
        </div>
        {favorites.length ? (
          <div className="org-grid">
            {favorites.map((favorite) => (
              <Link
                className="org-card"
                key={favorite.key}
                href={`/o/${favorite.orgId}/${favorite.hall}?item=${favorite.scope}:${favorite.itemId}`}
              >
                <Star size={24} />
                <span className="eyebrow">{favorite.orgId}</span>
                <h2>{localize(favorite.item.title, locale)}</h2>
                <p>{localize(favorite.item.summary, locale)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Star size={34} />
            <h2>{t("noFavorites")}</h2>
            <Link className="pill-button" href="/prompts">
              {t("hall.prompts")}
            </Link>
          </div>
        )}
      </section>
      <OrganizationSection viewer={viewer} orgs={orgs} />
    </PortalShell>
  );
}
