"use client";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Plus, Landmark } from "lucide-react";
import { PortalShell } from "./portal-shell";
import { Link } from "@/i18n/navigation";
import { localize, type Org, type Viewer } from "@/lib/schema";
export function OrgPicker({ viewer, orgs }: { viewer: Viewer; orgs: Org[] }) {
  const t = useTranslations("portal"),
    locale = useLocale();
  return (
    <PortalShell viewer={viewer}>
      <section className="portal-intro">
        <div>
          <span className="eyebrow">{t("orgEyebrow")}</span>
          <h1>{t("chooseOrg")}</h1>
          <p>{t("chooseOrgDescription")}</p>
        </div>
        {viewer.platformAdmin && (
          <Link className="outline-button" href="/platform">
            {t("platform")}
            <ArrowUpRight size={17} />
          </Link>
        )}
      </section>
      <div className="org-grid">
        {orgs.map((org) => (
          <Link href={`/o/${org.id}`} className="org-card" key={org.id}>
            <Landmark size={34} strokeWidth={1.3} />
            <span className="eyebrow">{org.slug}</span>
            <h2>{localize(org.name, locale)}</h2>
            <span className="text-button">
              {t("enterOrg")}
              <ArrowRightIcon />
            </span>
          </Link>
        ))}
        <Link className="org-card join-card" href="/join">
          <Plus size={34} />
          <h2>{t("joinAnother")}</h2>
          <p>{t("joinDescription")}</p>
        </Link>
      </div>
      {!orgs.length && <p className="notice">{t("noOrgs")}</p>}
    </PortalShell>
  );
}
function ArrowRightIcon() {
  return <ArrowUpRight size={18} />;
}
