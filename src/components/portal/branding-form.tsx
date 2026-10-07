"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { orgSchema, type Org } from "@/lib/schema";
import { api, ApiError } from "@/lib/client-api";
export function BrandingForm({
  org,
  onSaved,
}: {
  org?: Org;
  onSaved: (value: { id?: string; code?: string }) => void;
}) {
  const t = useTranslations("portal"),
    [slug, setSlug] = useState(org?.slug || ""),
    [name, setName] = useState(org?.name || { ko: "", en: "" }),
    [logo, setLogo] = useState(org?.logoUrl || ""),
    [palette, setPalette] = useState(org?.theme.palette || "gallery"),
    [mode, setMode] = useState(org?.theme.mode || "system"),
    [locale, setLocale] = useState(org?.defaultLocale || "ko"),
    [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const parsed = orgSchema.safeParse({
        slug,
        name,
        logoUrl: logo,
        theme: { palette, mode },
        defaultLocale: locale,
        locales: ["ko", "en"],
        ...(email ? { firstAdminEmail: email } : {}),
      });
      if (!parsed.success) {
        setError("invalid");
        return;
      }
      const result = await api<{ id?: string; code?: string }>(
        org
          ? `/api/portal/orgs/${org.id}/branding`
          : "/api/portal/platform/orgs",
        parsed.data,
      );
      onSaved(result);
    } catch (error) {
      setError(error instanceof ApiError ? error.code : "unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="editor-form" onSubmit={save}>
      <h2>{t(org ? "branding" : "createOrg")}</h2>
      <label>
        {t("orgSlug")}
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          pattern="[a-z][a-z0-9\-]{2,39}"
          required
          disabled={!!org}
        />
        <span className="field-hint">{t("slugHint")}</span>
      </label>
      <div className="form-columns">
        {(["ko", "en"] as const).map((lang) => (
          <label key={lang}>
            {t("orgName")} · {t(lang === "ko" ? "korean" : "english")}
            <input
              required={lang === "ko"}
              value={name[lang] || ""}
              onChange={(e) => setName({ ...name, [lang]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <label>
        {t("logoUrl")}
        <input
          type="url"
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          placeholder="https://"
        />
      </label>
      <div className="form-columns">
        <label>
          {t("palette")}
          <select
            value={palette}
            onChange={(e) => setPalette(e.target.value as typeof palette)}
          >
            {["gallery", "ocean", "tangerine", "forest"].map((p) => (
              <option key={p} value={p}>
                {t(`paletteName.${p}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("appearance")}
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            {["system", "light", "dark"].map((p) => (
              <option key={p} value={p}>
                {t(`mode.${p}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("defaultLanguage")}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as typeof locale)}
          >
            <option value="ko">{t("korean")}</option>
            <option value="en">{t("english")}</option>
          </select>
        </label>
      </div>
      {!org && (
        <label>
          {t("firstAdminEmail")}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <span className="field-hint">{t("firstAdminHint")}</span>
        </label>
      )}
      {error && (
        <p role="alert" className="notice error">
          {t(`errors.${error}`)}
        </p>
      )}
      <button className="pill-button" disabled={busy}>
        {t(busy ? "saving" : org ? "save" : "createOrg")}
      </button>
    </form>
  );
}
