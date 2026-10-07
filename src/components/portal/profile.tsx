"use client";
import { useLocale, useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { PortalShell } from "./portal-shell";
import { Link } from "@/i18n/navigation";
import { localize, type PortalItem, type Viewer } from "@/lib/schema";
export function Profile({
  viewer,
  favorites,
}: {
  viewer: Viewer;
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
  return (
    <PortalShell viewer={viewer}>
      <section className="portal-intro">
        <div>
          <span className="eyebrow">{viewer.email}</span>
          <h1>{t("favorites")}</h1>
          <p>{t("favoritesDescription")}</p>
        </div>
      </section>
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
          <Link className="pill-button" href="/orgs?choose=1">
            {t("chooseOrg")}
          </Link>
        </div>
      )}
    </PortalShell>
  );
}
