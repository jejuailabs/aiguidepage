"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Ticket, ArrowRight } from "lucide-react";
import { api, ApiError } from "@/lib/client-api";
import { Link } from "@/i18n/navigation";
export function JoinForm({
  initialCode = "",
  signedIn,
}: {
  initialCode?: string;
  signedIn: boolean;
}) {
  const router = useRouter(),
    t = useTranslations("portal"),
    locale = useLocale();
  const [code, setCode] = useState(initialCode),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!signedIn) {
      router.push(
        `/${locale}/login?next=${encodeURIComponent(`/${locale}/join?code=${encodeURIComponent(code)}`)}`,
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api<{ id: string }>("/api/portal/join", { code });
      router.push(`/${locale}/o/${result.id}`);
    } catch (error) {
      setError(error instanceof ApiError ? error.code : "unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <Link className="back-link" href="/">
        ← {t("browse")}
      </Link>
      <section className="auth-card">
        <Ticket size={36} strokeWidth={1.4} />
        <span className="eyebrow">{t("joinEyebrow")}</span>
        <h1>{t("joinTitle")}</h1>
        <p>{t("joinDescription")}</p>
        <form onSubmit={submit}>
          <label htmlFor="invite-code">{t("inviteCode")}</label>
          <input
            id="invite-code"
            autoComplete="off"
            autoCapitalize="characters"
            required
            maxLength={30}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="AI-XXXXXXXX"
          />
          <button className="pill-button" disabled={busy}>
            {t(busy ? "working" : signedIn ? "join" : "loginToJoin")}
            <ArrowRight size={18} />
          </button>
        </form>
        {error && (
          <p role="alert" className="notice error">
            {t(`errors.${error}`)}
          </p>
        )}
      </section>
    </main>
  );
}
