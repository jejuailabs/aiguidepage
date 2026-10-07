import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
export async function AccessNotice({ code = "forbidden" }: { code?: string }) {
  const t = await getTranslations("portal");
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>{t("accessTitle")}</h1>
        <p>{t(`errors.${code}`)}</p>
        <Link className="pill-button" href="/orgs?choose=1">
          {t("switchOrg")}
        </Link>
        <Link className="text-button" href="/">
          {t("browse")}
        </Link>
      </section>
    </main>
  );
}
