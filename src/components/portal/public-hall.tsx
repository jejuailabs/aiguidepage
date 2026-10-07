"use client";
import { Suspense, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowRight, Gamepad2, Search } from "lucide-react";
import { Header } from "@/components/shell/header";
import { Settings } from "@/components/shell/settings";
import { Modal } from "@/components/shell/modal";
import { usePreferences } from "@/theme/use-preferences";
import { localize, type PortalItem } from "@/lib/schema";
import { gameRegistry } from "@/games/registry";
import { aiItems } from "@/data/ai";
import { MediaPreview } from "./media-gallery";
import { PromptWorkbench } from "./hall-view";
import { Link } from "@/i18n/navigation";
export function PublicHall({
  hall,
  items,
}: {
  hall: "prompts" | "games";
  items: PortalItem[];
}) {
  const t = useTranslations("portal"),
    locale = useLocale(),
    router = useRouter(),
    { preferences, update } = usePreferences();
  const [active, setActive] = useState<PortalItem | null>(null),
    [settings, setSettings] = useState(false),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [limit, setLimit] = useState(12);
  const focus = useRef<HTMLElement | null>(null);
  const categories = Array.from(new Set(items.map((item) => item.category)));
  const visible = items.filter(
    (item) =>
      (filter === "all" || filter === item.category) &&
      `${localize(item.title, locale)} ${localize(item.summary, locale)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const Game =
    active?.type === "game" ? gameRegistry[active.data.gameKey] : null;
  return (
    <>
      <Header
        activeHall={hall}
        mode={preferences.mode}
        brandHref={`/${locale}`}
        onSettings={() => {
          focus.current = document.activeElement as HTMLElement;
          setSettings(true);
        }}
        onSearch={() => document.getElementById("public-hall-search")?.focus()}
        onLogin={() => router.push(`/${locale}/login`)}
        onTheme={() =>
          update({
            mode:
              document.documentElement.dataset.mode === "dark"
                ? "light"
                : "dark",
          })
        }
        onHall={(id) => router.push(`/${locale}${id === "ai" ? "" : `/${id}`}`)}
      />
      <main id="gallery" className="portal-main public-hall">
        <section className="portal-intro">
          <div>
            <h1>{t(`hall.${hall}`)}</h1>
            <p>{t(`hallDescription.${hall}`)}</p>
          </div>
          <span className="collection-count">
            {t("itemCount", { count: items.length })}
          </span>
        </section>
        <div className="public-hall-search">
          <Search size={18} />
          <input
            id="public-hall-search"
            type="search"
            aria-label={t("search")}
            placeholder={t("search")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(12);
            }}
          />
        </div>
        <div className="portal-filters">
          <div className="category-bar">
            {["all", ...categories].map((category) => (
              <button
                key={category}
                aria-pressed={filter === category}
                className={filter === category ? "selected" : ""}
                onClick={() => {
                  setFilter(category);
                  setLimit(12);
                }}
              >
                {t.has(`category.${category}`)
                  ? t(`category.${category}`)
                  : category}
              </button>
            ))}
          </div>
        </div>
        <div className={`content-grid layout-${hall}`}>
          {visible.slice(0, limit).map((item) => (
            <article key={item.id} className={`content-card card-${hall}`}>
              {item.type === "prompt" && (
                <button
                  className="prompt-result-cover"
                  aria-label={t("viewResult", {
                    title: localize(item.title, locale),
                  })}
                  onClick={(event) => {
                    focus.current = event.currentTarget;
                    setActive(item);
                  }}
                >
                  {item.data.resultMedia.length ? (
                    <MediaPreview
                      asset={item.data.resultMedia[0]}
                      alt={localize(item.title, locale)}
                    />
                  ) : item.data.resultText ? (
                    <div className="result-text-preview">
                      {localize(item.data.resultText, locale)}
                    </div>
                  ) : (
                    <div className="prompt-text-cover">
                      <span>
                        {t.has(`category.${item.category}`)
                          ? t(`category.${item.category}`)
                          : item.category}
                      </span>
                      <p>{localize(item.data.text, locale)}</p>
                    </div>
                  )}
                </button>
              )}
              <div className="card-meta">
                {item.type === "prompt" ? (
                  <span className="provider-tag">
                    {aiItems.find((ai) => ai.id === item.data.aiSlug)?.name}
                  </span>
                ) : (
                  <Gamepad2 size={27} />
                )}
              </div>
              <button
                className="content-open"
                onClick={(event) => {
                  focus.current = event.currentTarget;
                  setActive(item);
                }}
              >
                <h2>{localize(item.title, locale)}</h2>
                <p>{localize(item.summary, locale)}</p>
                {item.type === "game" && (
                  <div
                    className={`arcade-art art-${item.data.gameKey}`}
                    aria-hidden="true"
                  >
                    {item.data.gameKey === "memory-match" ? "✦ ✦" : "?"}
                    <span>{t("playLabel")}</span>
                  </div>
                )}
              </button>
              <button
                className="text-button"
                onClick={(event) => {
                  focus.current = event.currentTarget;
                  setActive(item);
                }}
              >
                {t(item.type === "prompt" ? "usePrompt" : "play")}
                <ArrowRight size={17} />
              </button>
            </article>
          ))}
        </div>
        {!visible.length && <p className="empty-state">{t("empty")}</p>}
        {limit < visible.length && (
          <div className="feed-sentinel">
            <button
              className="outline-button"
              onClick={() => setLimit((value) => value + 12)}
            >
              {t("loadMore")}
            </button>
          </div>
        )}
        <footer className="public-hall-footer">
          <Link href="/platform">{t("manageContent")}</Link>
        </footer>
      </main>
      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? localize(active.title, locale) : ""}
        description={active ? localize(active.summary, locale) : ""}
        className="workbench-panel"
        returnFocus={focus}
      >
        {active && (
          <div className="workbench">
            <h2>{localize(active.title, locale)}</h2>
            <p>{localize(active.summary, locale)}</p>
            <Suspense fallback={<p role="status">{t("loading")}</p>}>
              {active.type === "prompt" ? (
                <PromptWorkbench item={active} />
              ) : active.type === "game" && Game ? (
                <Game item={active} />
              ) : null}
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
