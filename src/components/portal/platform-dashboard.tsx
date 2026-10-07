"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, ArrowUpRight } from "lucide-react";
import { PortalShell } from "./portal-shell";
import { BrandingForm } from "./branding-form";
import { ItemEditor } from "./item-editor";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/client-api";
import { localize, type Org, type Viewer, type PortalItem } from "@/lib/schema";
type Data = { orgs: (Org & { memberCount: number })[]; items: PortalItem[] };
export function PlatformDashboard({
  viewer,
  initial,
}: {
  viewer: Viewer;
  initial: Data;
}) {
  const t = useTranslations("portal"),
    locale = useLocale(),
    [data, setData] = useState(initial),
    [tab, setTab] = useState("orgs"),
    [create, setCreate] = useState(false),
    [editing, setEditing] = useState<PortalItem | null | undefined>(undefined),
    [code, setCode] = useState(""),
    [error, setError] = useState(false);
  async function refresh() {
    try {
      setData(await api<Data>("/api/portal/platform"));
    } catch {
      setError(true);
    }
  }
  return (
    <PortalShell viewer={viewer}>
      <section className="portal-intro">
        <div>
          <span className="eyebrow">{t("platformEyebrow")}</span>
          <h1>{t("platform")}</h1>
          <p>{t("platformDescription")}</p>
        </div>
      </section>
      <div className="admin-tabs">
        {["orgs", "commonContent"].map((key) => (
          <button
            key={key}
            className={tab === key ? "selected" : ""}
            aria-pressed={tab === key}
            onClick={() => {
              setTab(key);
              setEditing(undefined);
              setCreate(false);
            }}
          >
            {t(key)}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="notice error">
          {t("errors.unavailable")}
        </p>
      )}
      {code && (
        <div className="invite-result">
          <p>{t("firstInvite")}</p>
          <strong>{code}</strong>
          <button
            className="outline-button"
            onClick={() =>
              void navigator.clipboard
                .writeText(
                  `${window.location.origin}/${locale}/join?code=${code}`,
                )
                .catch(() => setError(true))
            }
          >
            {t("copyInviteLink")}
          </button>
        </div>
      )}
      <section className="admin-panel">
        {tab === "orgs" ? (
          create ? (
            <>
              <BrandingForm
                onSaved={(result) => {
                  setCode(result.code || "");
                  setCreate(false);
                  void refresh();
                }}
              />
              <button className="text-button" onClick={() => setCreate(false)}>
                {t("cancel")}
              </button>
            </>
          ) : (
            <>
              <div className="section-heading">
                <h2>{t("orgs")}</h2>
                <button className="pill-button" onClick={() => setCreate(true)}>
                  <Plus size={17} />
                  {t("createOrg")}
                </button>
              </div>
              <div className="org-grid">
                {data.orgs.map((org) => (
                  <article className="org-card" key={org.id}>
                    <span className="eyebrow">{org.slug}</span>
                    <h3>{localize(org.name, locale)}</h3>
                    <p>{t("memberCount", { count: org.memberCount })}</p>
                    <Link
                      className="outline-button"
                      href={`/o/${org.id}/admin`}
                    >
                      {t("manageOrg")}
                      <ArrowUpRight size={17} />
                    </Link>
                  </article>
                ))}
              </div>
              {!data.orgs.length && <p>{t("noOrgs")}</p>}
            </>
          )
        ) : editing !== undefined ? (
          <ItemEditor
            common
            item={editing || undefined}
            endpoint={`/api/portal/platform/items${editing ? `/${editing.id}` : ""}`}
            onCancel={() => setEditing(undefined)}
            onSaved={() => {
              setEditing(undefined);
              void refresh();
            }}
          />
        ) : (
          <>
            <div className="section-heading">
              <h2>{t("commonContent")}</h2>
              <button className="pill-button" onClick={() => setEditing(null)}>
                <Plus size={17} />
                {t("addItem")}
              </button>
            </div>
            <div className="admin-list">
              {data.items.map((item) => (
                <div className="admin-row" key={item.id}>
                  <div>
                    <strong>{localize(item.title, locale)}</strong>
                    <small>
                      {t(`type.${item.type}`)} · {t(item.status)}
                    </small>
                  </div>
                  <button
                    className="outline-button"
                    onClick={() => setEditing(item)}
                  >
                    {t("edit")}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </PortalShell>
  );
}
