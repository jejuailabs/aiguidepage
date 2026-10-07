"use client";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, GripVertical, Plus, Copy } from "lucide-react";
import { PortalShell } from "./portal-shell";
import { ItemEditor } from "./item-editor";
import { BrandingForm } from "./branding-form";
import {
  localize,
  type Org,
  type Hall,
  type PortalItem,
  type Viewer,
  type Membership,
} from "@/lib/schema";
import { api, ApiError } from "@/lib/client-api";
type Overview = {
  org: Org;
  role: string;
  members: (Membership & { uid: string })[];
  halls: Hall[];
  items: PortalItem[];
  common: PortalItem[];
  overrides: Record<string, { hidden?: boolean; order?: number }>;
  invites: {
    code: string;
    role: string;
    email: string;
    active: boolean;
    uses: number;
    maxUses: number;
    expiresAt: number;
  }[];
};
export function AdminDashboard({
  viewer,
  initial,
}: {
  viewer: Viewer;
  initial: Overview;
}) {
  const t = useTranslations("portal"),
    locale = useLocale(),
    [data, setData] = useState(initial),
    [tab, setTab] = useState("members"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [editing, setEditing] = useState<PortalItem | null | undefined>(undefined),
    [filter, setFilter] = useState("ai"),
    [inviteRole, setInviteRole] = useState("member"),
    [days, setDays] = useState(7),
    [maxUses, setMaxUses] = useState(10),
    [email, setEmail] = useState(""),
    [newCode, setNewCode] = useState("");
  const drag = useRef<number | null>(null),
    base = `/api/portal/orgs/${data.org.id}`;
  async function reload() {
    setData(await api<Overview>(`${base}/admin`));
  }
  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      await reload();
      setNotice("saved");
    } catch (error) {
      setError(error instanceof ApiError ? error.code : "unavailable");
    } finally {
      setBusy(false);
    }
  }
  async function move(from: number, to: number) {
    if (to < 0 || to >= data.halls.length) return;
    const list = [...data.halls];
    const [hall] = list.splice(from, 1);
    list.splice(to, 0, hall);
    await run(async () => {
      for (let i = 0; i < list.length; i++)
        await api(`${base}/halls`, { ...list[i], order: i });
    });
  }
  return (
    <PortalShell viewer={viewer} org={data.org} halls={data.halls} admin>
      <section className="portal-intro">
        <div>
          <span className="eyebrow">{t("adminEyebrow")}</span>
          <h1>{t("manageOrg")}</h1>
          <p>{localize(data.org.name, locale)}</p>
        </div>
      </section>
      <div className="admin-tabs" role="tablist" aria-label={t("manageOrg")}>
        {["members", "halls", "content", "branding"].map((key) => (
          <button
            role="tab"
            aria-selected={tab === key}
            key={key}
            onClick={() => {
              setTab(key);
              setEditing(undefined);
            }}
            className={tab === key ? "selected" : ""}
          >
            {t(key)}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="notice error">
          {t(`errors.${error}`)}
        </p>
      )}
      {notice && (
        <p role="status" className="notice success">
          {t(notice)}
        </p>
      )}
      <section className="admin-panel" role="tabpanel">
        {tab === "members" && (
          <>
            <div className="section-heading">
              <h2>{t("members")}</h2>
              <span>{data.members.length}</span>
            </div>
            <div className="admin-list">
              {data.members.map((member) => (
                <div className="admin-row" key={member.uid}>
                  <div>
                    <strong>{member.displayName}</strong>
                    <small>{member.email}</small>
                  </div>
                  <label className="sr-only" htmlFor={`role-${member.uid}`}>
                    {t("role")}
                  </label>
                  <select
                    id={`role-${member.uid}`}
                    value={member.role}
                    disabled={busy || member.uid === viewer.uid}
                    onChange={(event) =>
                      void run(() =>
                        api(`${base}/members/${member.uid}`, {
                          role: event.target.value,
                        }),
                      )
                    }
                  >
                    <option value="member">{t("member")}</option>
                    <option value="admin">{t("admin")}</option>
                  </select>
                  <button
                    className="text-button danger-text"
                    disabled={busy || member.uid === viewer.uid}
                    onClick={() => {
                      if (window.confirm(t("removeMemberConfirm")))
                        void run(() =>
                          api(`${base}/members/${member.uid}`, {
                            role: "remove",
                          }),
                        );
                    }}
                  >
                    {t("removeMember")}
                  </button>
                </div>
              ))}
            </div>
            <form
              className="invite-form"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const result = await api<{ code: string }>(
                    `${base}/invites`,
                    { role: inviteRole, days, maxUses, email },
                  );
                  setNewCode(result.code);
                });
              }}
            >
              <h2>{t("createInvite")}</h2>
              <div className="form-columns">
                <label>
                  {t("role")}
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="member">{t("member")}</option>
                    <option value="admin">{t("admin")}</option>
                  </select>
                </label>
                <label>
                  {t("expiresDays")}
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  />
                </label>
                <label>
                  {t("maxUses")}
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                  />
                </label>
              </div>
              <label>
                {t("inviteEmailOptional")}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button className="pill-button" disabled={busy}>
                {t("createInvite")}
              </button>
            </form>
            {newCode && (
              <div className="invite-result">
                <strong>{newCode}</strong>
                <button
                  className="outline-button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${window.location.origin}/${locale}/join?code=${newCode}`,
                      );
                      setNotice("copied");
                    } catch {
                      setError("copyFailed");
                    }
                  }}
                >
                  <Copy size={16} />
                  {t("copyInviteLink")}
                </button>
              </div>
            )}
            <h3>{t("invites")}</h3>
            <div className="admin-list">
              {data.invites.map((invite) => (
                <div className="admin-row" key={invite.code}>
                  <div>
                    <strong>{invite.code}</strong>
                    <small>
                      {t(invite.role)} · {invite.uses}/{invite.maxUses} ·{" "}
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeZone: "Asia/Seoul",
                      }).format(invite.expiresAt)}
                    </small>
                    {invite.email && <small>{invite.email}</small>}
                  </div>
                  <span className="status-badge">
                    {t(invite.active ? "active" : "inactive")}
                  </span>
                  <button
                    className="text-button"
                    disabled={busy || !invite.active}
                    onClick={() =>
                      void run(() =>
                        api(
                          `${base}/invites/${invite.code}`,
                          undefined,
                          "DELETE",
                        ),
                      )
                    }
                  >
                    {t("disableInvite")}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "halls" && (
          <>
            <h2>{t("halls")}</h2>
            <p>{t("hallManageHint")}</p>
            <div className="admin-list">
              {data.halls.map((hall, index) => (
                <div
                  className="hall-admin-row"
                  draggable={!busy}
                  onDragStart={() => {
                    drag.current = index;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (drag.current !== null) void move(drag.current, index);
                    drag.current = null;
                  }}
                  key={hall.key}
                >
                  <GripVertical className="drag-handle" aria-hidden="true" />
                  <div className="hall-name-fields">
                    {(["ko", "en"] as const).map((lang) => (
                      <label key={lang}>
                        {t(lang === "ko" ? "korean" : "english")}
                        <input
                          defaultValue={hall.title[lang]}
                          key={`${hall.key}-${lang}-${hall.title[lang]}`}
                          onBlur={(event) => {
                            if (event.target.value !== hall.title[lang])
                              void run(() =>
                                api(`${base}/halls`, {
                                  ...hall,
                                  title: {
                                    ...hall.title,
                                    [lang]: event.target.value,
                                  },
                                }),
                              );
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    className="toggle-control"
                    role="switch"
                    aria-checked={hall.enabled}
                    aria-label={localize(hall.title, locale)}
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        api(`${base}/halls`, {
                          ...hall,
                          enabled: !hall.enabled,
                        }),
                      )
                    }
                  >
                    {t(hall.enabled ? "enabled" : "disabled")}
                  </button>
                  <div className="button-row">
                    <button
                      className="icon-button"
                      aria-label={t("moveUp")}
                      disabled={busy || index === 0}
                      onClick={() => void move(index, index - 1)}
                    >
                      <ArrowUp size={18} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={t("moveDown")}
                      disabled={busy || index === data.halls.length - 1}
                      onClick={() => void move(index, index + 1)}
                    >
                      <ArrowDown size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "content" &&
          (editing !== undefined ? (
            <ItemEditor
              item={editing || undefined}
              endpoint={`${base}/items${editing ? `/${editing.id}` : ""}`}
              common={false}
              onCancel={() => setEditing(undefined)}
              onSaved={() => {
                setEditing(undefined);
                void run(async () => {});
              }}
            />
          ) : (
            <>
              <div className="section-heading">
                <h2>{t("content")}</h2>
                <button
                  className="pill-button"
                  onClick={() => setEditing(null)}
                >
                  <Plus size={17} />
                  {t("addItem")}
                </button>
              </div>
              <div className="category-bar">
                {["ai", "prompt", "tool", "game"].map((type) => (
                  <button
                    key={type}
                    aria-pressed={filter === type}
                    className={filter === type ? "selected" : ""}
                    onClick={() => setFilter(type)}
                  >
                    {t(`type.${type}`)}
                  </button>
                ))}
              </div>
              <h3>{t("orgContent")}</h3>
              <div className="admin-list">
                {data.items
                  .filter((item) => item.type === filter)
                  .map((item) => (
                    <div className="admin-row" key={item.id}>
                      <div>
                        <strong>{localize(item.title, locale)}</strong>
                        <small>{t(item.status)}</small>
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
              <h3>{t("commonContent")}</h3>
              <p>{t("commonHint")}</p>
              <div className="admin-list">
                {data.common
                  .filter(
                    (item) =>
                      item.type === filter && item.status === "published",
                  )
                  .map((item) => {
                    const override = data.overrides[item.id] || {};
                    return (
                      <div className="admin-row" key={item.id}>
                        <strong>{localize(item.title, locale)}</strong>
                        <label className="check-label">
                          <input
                            type="checkbox"
                            checked={!override.hidden}
                            disabled={busy}
                            onChange={(e) =>
                              void run(() =>
                                api(`${base}/overrides/${item.id}`, {
                                  ...override,
                                  hidden: !e.target.checked,
                                }),
                              )
                            }
                          />
                          {t("show")}
                        </label>
                        <label className="order-field">
                          {t("order")}
                          <input
                            type="number"
                            min={0}
                            max={100000}
                            defaultValue={override.order ?? item.order}
                            onBlur={(e) => {
                              if (
                                Number(e.target.value) !==
                                (override.order ?? item.order)
                              )
                                void run(() =>
                                  api(`${base}/overrides/${item.id}`, {
                                    hidden: !!override.hidden,
                                    order: Number(e.target.value),
                                  }),
                                );
                            }}
                          />
                        </label>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              api(`${base}/overrides/${item.id}`, {
                                hidden: !!override.hidden,
                              }),
                            )
                          }
                        >
                          {t("defaultOrder")}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </>
          ))}
        {tab === "branding" && (
          <BrandingForm
            org={data.org}
            onSaved={() => void run(async () => {})}
          />
        )}
      </section>
    </PortalShell>
  );
}
