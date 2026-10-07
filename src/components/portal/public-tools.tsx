"use client";
import { useRef, useState, Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  FilePenLine,
  LetterText,
  QrCode,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { Header } from "@/components/shell/header";
import { Settings } from "@/components/shell/settings";
import { Modal } from "@/components/shell/modal";
import { usePreferences } from "@/theme/use-preferences";
import { localize, type PortalItem } from "@/lib/schema";
import { toolRegistry } from "@/tools/registry";
import {Link} from '@/i18n/navigation';
type ToolItem = PortalItem & { type: "tool" };
const icons = {
  "prompt-builder": FilePenLine,
  "char-count": LetterText,
  "qr-maker": QrCode,
  "template-fill": ClipboardList,
};
export function PublicTools({
  items,
  signedIn,
}: {
  items: ToolItem[];
  signedIn: boolean;
}) {
  const t = useTranslations("portal"),
    locale = useLocale(),
    router = useRouter(),
    { preferences, update } = usePreferences();
  const [active, setActive] = useState<ToolItem | null>(null),
    [settings, setSettings] = useState(false);
  const focus = useRef<HTMLElement | null>(null);
  const Tool = active ? toolRegistry[active.data.toolKey] : null;
  return (
    <>
      <Header
        activeHall="tools"
        mode={preferences.mode}
        brandHref={`/${locale}`}
        onSettings={() => {
          focus.current = document.activeElement as HTMLElement;
          setSettings(true);
        }}
        onSearch={() => router.push(`/${locale}`)}
        onLogin={() => router.push(`/${locale}/${signedIn ? "orgs" : "login"}`)}
        onTheme={() =>
          update({
            mode:
              document.documentElement.dataset.mode === "dark"
                ? "light"
                : "dark",
          })
        }
        onHall={(hall) =>
          router.push(
            `/${locale}${hall === "ai" ? "" : `/${hall}`}`,
          )
        }
      />
      <main id="gallery" className="portal-main public-tools">
        <section className="portal-intro">
          <div>
            <h1>{t("hall.tools")}</h1>
            <p>{t("hallDescription.tools")}</p>
          </div>
        </section>
        <div className="simple-tools-grid">
          {items.map((item) => {
            const Icon = icons[item.data.toolKey];
            return (
              <button
                key={item.id}
                className="simple-tool-card"
                onClick={(event) => {
                  focus.current = event.currentTarget;
                  setActive(item);
                }}
              >
                <Icon size={27} />
                <h2>{localize(item.title, locale)}</h2>
                <p>{localize(item.summary, locale)}</p>
                <span>
                  {t("openTool")}
                  <ArrowRight size={16} />
                </span>
              </button>
            );
          })}
        </div>
        <p className="tools-local-note">{t("localOnly")}</p>
        <footer className="public-hall-footer"><Link href="/platform">{t('manageContent')}</Link></footer>
      </main>
      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? localize(active.title, locale) : ""}
        description={active ? localize(active.summary, locale) : ""}
        className="workbench-panel"
        returnFocus={focus}
      >
        {active && Tool && (
          <div className="workbench">
            <h2>{localize(active.title, locale)}</h2>
            <p>{localize(active.summary, locale)}</p>
            <Suspense fallback={<p role="status">{t("loading")}</p>}>
              <Tool key={active.id} item={active} />
            </Suspense>
          </div>
        )}
      </Modal>
      <Modal
        open={settings}
        onClose={() => setSettings(false)}
        title={t("settings")}
        description={t("workspace")}
        className="settings-panel"
        returnFocus={focus}
      >
        <Settings preferences={preferences} update={update} />
      </Modal>
    </>
  );
}
