"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Landmark, Mail, Check } from "lucide-react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type User,
} from "firebase/auth";
import { getBrowserAuth } from "@/lib/firebase/auth";
import { api, ApiError } from "@/lib/client-api";
import { Link } from "@/i18n/navigation";

export function LoginForm() {
  const t = useTranslations("portal"),
    locale = useLocale();
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState(""),
    [emailLink, setEmailLink] = useState(false);
  const started = useRef(false);
  async function finish(user: User) {
    let result = await api<{ refreshToken?: boolean }>("/api/session", {
      idToken: await user.getIdToken(),
    });
    if (result.refreshToken)
      result = await api("/api/session", {
        idToken: await user.getIdToken(true),
      });
    if (result.refreshToken) throw new ApiError("recentLogin");
    const target = new URLSearchParams(window.location.search).get("next");
    window.location.assign(
      target?.startsWith(`/${locale}/`) && !target.includes("\\")
        ? target
        : `/${locale}/orgs`,
    );
  }
  function showError(error: unknown) {
    const code =
      error instanceof ApiError
        ? error.code
        : (error as { code?: string })?.code;
    const mapped: Record<string, string> = {
      "auth/popup-closed-by-user": "popupClosed",
      "auth/popup-blocked": "popupBlocked",
      "auth/unauthorized-domain": "domain",
      "auth/operation-not-allowed": "provider",
      "auth/invalid-action-code": "emailExpired",
      "auth/expired-action-code": "emailExpired",
      "auth/too-many-requests": "rateLimit",
      "auth/invalid-email": "invalid",
    };
    setError(
      mapped[code || ""] || (error instanceof ApiError ? code! : "unavailable"),
    );
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      const auth = getBrowserAuth();
      if (isSignInWithEmailLink(auth, window.location.href)) {
        // Initialize callback state from the external Firebase action URL once.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEmailLink(true);
        const saved = localStorage.getItem("aiguide-email");
        if (saved) {
          setEmail(saved);
          setBusy(true);
          void signInWithEmailLink(auth, saved, window.location.href)
            .then(async (result) => {
              localStorage.removeItem("aiguide-email");
              await finish(result.user);
            })
            .catch(showError)
            .finally(() => setBusy(false));
        }
      }
    } catch {
      setError("notReady");
    }
    // The callback URL is handled once; locale changes create a fresh route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function google() {
    setBusy(true);
    setError("");
    try {
      const auth = getBrowserAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await finish((await signInWithPopup(auth, provider)).user);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const auth = getBrowserAuth();
      if (emailLink) {
        await finish(
          (await signInWithEmailLink(auth, email, window.location.href)).user,
        );
        localStorage.removeItem("aiguide-email");
      } else {
        const url = new URL(`/${locale}/login`, window.location.origin);
        const next = new URLSearchParams(window.location.search).get("next");
        if (next?.startsWith(`/${locale}/`)) url.searchParams.set("next", next);
        await sendSignInLinkToEmail(auth, email, {
          url: url.toString(),
          handleCodeInApp: true,
        });
        try {
          localStorage.setItem("aiguide-email", email);
        } catch {}
        setSent(true);
      }
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/">
        <Landmark size={30} />
        <span>{t("brand")}</span>
      </Link>
      <section className="auth-card">
        <span className="eyebrow">{t("welcomeEyebrow")}</span>
        <h1>{t("loginTitle")}</h1>
        <p>{t(emailLink ? "confirmEmail" : "loginDescription")}</p>
        {!emailLink && (
          <>
            <button className="pill-button" onClick={google} disabled={busy}>
              <span className="google-mark" aria-hidden="true">
                G
              </span>
              {t("google")}
              <ArrowRight size={18} />
            </button>
            <div className="form-divider">{t("or")}</div>
          </>
        )}
        <form onSubmit={submit}>
          <label htmlFor="email">{t("email")}</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
          <button className="outline-button" disabled={busy}>
            <Mail size={18} />
            {t(busy ? "working" : emailLink ? "continue" : "sendLink")}
          </button>
        </form>
        {sent && (
          <p className="notice success" role="status">
            <Check size={18} />
            {t("linkSent")}
          </p>
        )}
        {error && (
          <p className="notice error" role="alert">
            {t(`errors.${error}`)}
          </p>
        )}
        <Link href="/join" className="text-button">
          {t("haveInvite")}
          <ArrowRight size={16} />
        </Link>
        <Link href="/" className="muted-link">
          {t("browse")}
        </Link>
      </section>
      <p className="auth-footnote">{t("loginNote")}</p>
    </main>
  );
}
