"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, Eye, EyeOff } from "lucide-react";
import { PortalShell } from "./portal-shell";
import { ItemEditor } from "./item-editor";
import { api, ApiError } from "@/lib/client-api";
import { localize, type PortalItem, type Viewer } from "@/lib/schema";
import {
  aiCategoryIds,
  aiCategorySettingsSchema,
  type AiCategorySettings,
} from "@/lib/ai-categories";
import { Link } from "@/i18n/navigation";
export type AiAdminData = { items: PortalItem[]; settings: AiCategorySettings };
export function AiAdmin({
  viewer,
  initial,
}: {
  viewer: Viewer;
  initial: AiAdminData;
}) {
  const t = useTranslations("portal"),
    locale = useLocale();
  const [data, setData] = useState(initial),
    [settings, setSettings] = useState(initial.settings),
    [tab, setTab] = useState("ai"),
    [editing, setEditing] = useState<PortalItem | null | undefined>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(settings) !== JSON.stringify(data.settings);
  async function refresh() {
    const next = await api<AiAdminData>("/api/portal/platform/ai");
    setData(next);
    setSettings(next.settings);
  }
  async function afterSave() {
    setEditing(undefined);
    try {
      await refresh();
    } catch {
      setError("unavailable");
    }
  }
  async function toggle(item: PortalItem) {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api(`/api/portal/platform/items/${item.id}`, {
        ...item,
        status: "published",
        public: !(item.public && item.status === "published"),
      });
      await refresh();
      setSaved(true);
    } catch (error) {
      setError(error instanceof ApiError ? error.code : "unavailable");
    } finally {
      setBusy(false);
    }
  }
  async function saveCategories(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    const parsed = aiCategorySettingsSchema.safeParse(settings);
    if (!parsed.success) {
      setError("invalid");
      return;
    }
    setBusy(true);
    try {
      const next = await api<AiCategorySettings>(
        "/api/portal/platform/ai/categories",
        parsed.data,
      );
      setSettings(next);
      setData((value) => ({ ...value, settings: next }));
      setSaved(true);
    } catch (error) {
      setError(error instanceof ApiError ? error.code : "unavailable");
    } finally {
      setBusy(false);
    }
  }
  function move(index: number, offset: number) {
    setSaved(false);
    setSettings((current) => {
      const categories = [...current.categories];
      [categories[index], categories[index + offset]] = [
        categories[index + offset],
        categories[index],
      ];
      return { ...current, categories };
    });
  }
  return (
    <PortalShell viewer={viewer}>
      <section className="portal-intro">
        <div>
          <span className="eyebrow">{t("platformEyebrow")}</span>
          <h1>{t("aiAdmin")}</h1>
          <p>{t("aiAdminDescription")}</p>
        </div>
        <Link href="/" className="outline-button">
          {t("viewMain")}
        </Link>
        <Link href="/platform" className="outline-button">{t('manageContent')}</Link>
      </section>
      <div className="admin-tabs">
        {["ai", "categories"].map((key) => (
          <button
            key={key}
            className={tab === key ? "selected" : ""}
            aria-pressed={tab === key}
            disabled={busy}
            onClick={() => {
              if (dirty && !window.confirm(t("discardCategories"))) return;
              setSettings(data.settings);
              setEditing(undefined);
              setTab(key);
              setSaved(false);
              setError("");
            }}
          >
            {t(key === "ai" ? "aiList" : "aiCategories")}
          </button>
        ))}
      </div>
      {error && (
        <p className="notice error" role="alert">
          {t(`errors.${error}`)}
          {error === "changedReload" && (
            <button
              className="text-button"
              onClick={() =>
                void refresh()
                  .then(() => setError(""))
                  .catch(() => setError("unavailable"))
              }
            >
              {t("reload")}
            </button>
          )}
        </p>
      )}
      {saved && (
        <p className="notice" role="status">
          {t("saved")}
        </p>
      )}
      <section className="admin-panel">
        {tab === "ai" ? (
          editing !== undefined ? (
            <ItemEditor
              key={editing?.id || "new"}
              common
              aiOnly
              aiCategories={data.settings.categories}
              item={editing || undefined}
              endpoint={`/api/portal/platform/items${editing ? `/${editing.id}` : ""}`}
              onSaved={() => void afterSave()}
              onCancel={() => setEditing(undefined)}
            />
          ) : (
            <>
              <div className="section-heading">
                <h2>{t("aiList")}</h2>
                <button
                  className="pill-button"
                  onClick={() => {
                    setSaved(false);
                    setEditing(null);
                  }}
                >
                  <Plus size={17} />
                  {t("addAi")}
                </button>
              </div>
              <div className="admin-list">
                {data.items.map((item) => (
                  <div
                    className="admin-row ai-admin-row"
                    key={item.id}
                    data-ai-id={item.id}
                  >
                    <div>
                      <strong>{localize(item.title, locale)}</strong>
                      <small>
                        {aiCategoryIds(item as PortalItem & { type: "ai" })
                          .map((id) => {
                            const category = data.settings.categories.find(
                              (c) => c.id === id,
                            );
                            return category
                              ? localize(category.title, locale)
                              : id;
                          })
                          .join(" · ")}{" "}
                        ·{" "}
                        {t(
                          item.public && item.status === "published"
                            ? "shownOnMain"
                            : "hiddenOnMain",
                        )}
                      </small>
                    </div>
                    <div className="button-row">
                      <button
                        className="outline-button"
                        aria-label={t(
                          item.public && item.status === "published"
                            ? "hideAi"
                            : "showAi",
                          { name: localize(item.title, locale) },
                        )}
                        disabled={busy}
                        onClick={() => void toggle(item)}
                      >
                        {item.public && item.status === "published" ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}{" "}
                        {t(
                          item.public && item.status === "published"
                            ? "hide"
                            : "show",
                        )}
                      </button>
                      <button
                        className="outline-button"
                        aria-label={t("editAi", {
                          name: localize(item.title, locale),
                        })}
                        disabled={busy}
                        onClick={() => {
                          setSaved(false);
                          setEditing(item);
                        }}
                      >
                        {t("edit")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        ) : (
          <form onSubmit={saveCategories} className="category-editor">
            <div className="section-heading">
              <h2>{t("aiCategories")}</h2>
              <button
                type="button"
                className="outline-button"
                disabled={busy || settings.categories.length >= 30}
                onClick={() => {
                  setSaved(false);
                  setSettings((value) => ({
                    ...value,
                    categories: [
                      ...value.categories,
                      {
                        id: `cat-${crypto.randomUUID()}`,
                        title: { ko: "", en: "" },
                        enabled: true,
                      },
                    ],
                  }));
                }}
              >
                <Plus size={17} />
                {t("addCategory")}
              </button>
            </div>
            <p className="field-hint">{t("categoryManageHint")}</p>
            <fieldset disabled={busy} className="category-editor-fields">
              {settings.categories.map((category, index) => (
                <div className="category-editor-row" key={category.id}>
                  <div className="category-name-fields">
                    {(["ko", "en"] as const).map((language) => (
                      <label key={language}>
                        {t(language === "ko" ? "categoryKo" : "categoryEn")}
                        <input
                          value={category.title[language]}
                          maxLength={80}
                          required={language === "ko"}
                          onChange={(event) => {
                            setSaved(false);
                            setSettings((current) => ({
                              ...current,
                              categories: current.categories.map((c) =>
                                c.id === category.id
                                  ? {
                                      ...c,
                                      title: {
                                        ...c.title,
                                        [language]: event.target.value,
                                      },
                                    }
                                  : c,
                              ),
                            }));
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="category-row-actions">
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={category.enabled}
                        onChange={(event) => {
                          setSaved(false);
                          setSettings((current) => ({
                            ...current,
                            categories: current.categories.map((c) =>
                              c.id === category.id
                                ? { ...c, enabled: event.target.checked }
                                : c,
                            ),
                          }));
                        }}
                      />
                      {t("showCategory")}
                    </label>
                    <button
                      type="button"
                      className="icon-button"
                      disabled={index === 0}
                      aria-label={t("moveCategoryUp", {
                        name:
                          localize(category.title, locale) || String(index + 1),
                      })}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={18} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      disabled={index === settings.categories.length - 1}
                      aria-label={t("moveCategoryDown", {
                        name:
                          localize(category.title, locale) || String(index + 1),
                      })}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </fieldset>
            <div className="button-row">
              <button className="pill-button" disabled={busy || !dirty}>
                {t(busy ? "saving" : "save")}
              </button>
              <button
                type="button"
                className="outline-button"
                disabled={busy || !dirty}
                onClick={() => {
                  setSettings(data.settings);
                  setSaved(false);
                  setError("");
                }}
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        )}
      </section>
    </PortalShell>
  );
}
