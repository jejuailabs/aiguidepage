"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  Suspense,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { LayoutGroup, MotionConfig } from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  Star,
  Sparkles,
  Shapes,
  Gamepad2,
  Copy,
} from "lucide-react";
import { PortalShell } from "./portal-shell";
import { ShelfLayout } from "@/components/layouts/shelf";
import { AiStage } from "@/components/item/ai-stage";
import { Modal } from "@/components/shell/modal";
import { aiItems, type AiItem } from "@/data/ai";
import { toAiItem } from "@/lib/ai-item";
import { MediaPreview, MediaGallery, ReferenceImages } from "./media-gallery";
import {useMobilePlatform} from "@/lib/use-mobile-platform";
import {mobileAppHref} from "@/lib/mobile-launch";
import {useAiCategories} from '@/lib/use-ai-categories';
import {
  localize,
  type Viewer,
  type Org,
  type Hall,
  type PortalItem,
} from "@/lib/schema";
import { api, ApiError } from "@/lib/client-api";
import { toolRegistry } from "@/tools/registry";
import { gameRegistry } from "@/games/registry";

const keyOf = (item: PortalItem) => `${item.scope}:${item.id}`;
const subscribe = (callback: () => void) => {
  window.addEventListener("popstate", callback);
  window.addEventListener("portal-location", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("portal-location", callback);
  };
};
export function HallView({
  viewer,
  org,
  hall,
  halls,
  initialItems,
  initialCursor,
  role,
  initialSelected = "",
}: {
  viewer: Viewer;
  org: Org;
  hall: Hall;
  halls: Hall[];
  initialItems: PortalItem[];
  initialCursor: string | null;
  role: string;
  initialSelected?: string;
}) {
  const t = useTranslations("portal"),
    locale = useLocale();
  const aiCategoryOptions=useAiCategories();
  const [items, setItems] = useState(initialItems),
    [cursor, setCursor] = useState(initialCursor),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("all"),
    [aiFilter, setAiFilter] = useState("all"),
    [favorites, setFavorites] = useState<string[]>([]);
  const sentinel = useRef<HTMLDivElement | null>(null),
    focus = useRef<HTMLElement | null>(null),
    pushed = useRef(false),
    loading = useRef(false);
  const selected = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get("item") || "",
    () => initialSelected,
  );
  const active = items.find((item) => keyOf(item) === selected);
  const load = useCallback(async () => {
    if (!cursor || loading.current) return;
    loading.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await api<{
        items: PortalItem[];
        nextCursor: string | null;
      }>(
        `/api/portal/orgs/${org.id}/items?hall=${hall.key}&cursor=${encodeURIComponent(cursor)}`,
      );
      setItems((current) => [
        ...current,
        ...next.items.filter(
          (item) =>
            !current.some((existing) => keyOf(existing) === keyOf(item)),
        ),
      ]);
      setCursor(next.nextCursor);
    } catch (error) {
      setError(error instanceof ApiError ? error.code : "unavailable");
    } finally {
      loading.current = false;
      setBusy(false);
    }
  }, [cursor, hall.key, org.id]);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void load();
      },
      { rootMargin: "700px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [load, cursor, error]);
  useEffect(() => {
    void api<{ favorites: { orgId: string; scope: string; itemId: string }[] }>(
      "/api/portal/me/favorites",
    )
      .then((data) =>
        setFavorites(
          data.favorites
            .filter((f) => f.orgId === org.id)
            .map((f) => `${f.scope}:${f.itemId}`),
        ),
      )
      .catch(() => {});
  }, [org.id]);
  // A shared URL may point beyond the first Firestore page.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selected && !active && cursor && !busy && !error) void load();
  }, [selected, active, cursor, busy, error, load]);
  function open(item: PortalItem, element?: HTMLElement) {
    focus.current = element || (document.activeElement as HTMLElement);
    const url = new URL(window.location.href);
    url.searchParams.set("item", keyOf(item));
    history.pushState({ ...history.state }, "", url);
    pushed.current = true;
    window.dispatchEvent(new Event("portal-location"));
  }
  function close() {
    if (pushed.current) {
      pushed.current = false;
      history.back();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("item");
      history.replaceState(history.state, "", url);
      window.dispatchEvent(new Event("portal-location"));
    }
  }
  async function toggleFavorite(item: PortalItem) {
    const key = keyOf(item),
      enabled = !favorites.includes(key);
    try {
      await api(`/api/portal/orgs/${org.id}/favorites`, {
        scope: item.scope,
        itemId: item.id,
        enabled,
      });
      setFavorites((current) =>
        enabled ? [...current, key] : current.filter((value) => value !== key),
      );
    } catch (error) {
      setError(error instanceof ApiError ? error.code : "unavailable");
    }
  }
  const asAi = (item: PortalItem): AiItem => {
    return toAiItem(item, locale, keyOf(item),aiCategoryOptions);
  };
  const itemCategories = (item: PortalItem): string[] =>
    item.type === "ai"
      ? asAi(item).categories || [item.category]
      : [item.category];
  const visible = items.filter(
    (item) =>
      (filter === "all" || itemCategories(item).includes(filter)) &&
      (aiFilter === "all" ||
        (item.type === "prompt" && item.data.aiSlug === aiFilter)),
  );
  const categories = hall.key==='ai'?aiCategoryOptions.filter(option=>option.enabled).map(option=>option.id):Array.from(new Set(items.flatMap(itemCategories)));
  return (
    <PortalShell
      viewer={viewer}
      org={org}
      halls={halls}
      active={hall.key}
      admin={role === "admin"}
    >
      <MotionConfig reducedMotion="user">
        <LayoutGroup>
          <section className="portal-intro">
            <div>
              {hall.key !== "tools" && (
                <span className="eyebrow">{t(`hallEyebrow.${hall.key}`)}</span>
              )}
              <h1>{localize(hall.title, locale)}</h1>
              <p>{t(`hallDescription.${hall.key}`)}</p>
            </div>
            <span className="collection-count">
              {t("itemCount", { count: items.length })}
            </span>
          </section>
          <div className="portal-filters">
            <div className="category-bar">
              {["all", ...categories].map((category) => (
                <button
                  key={category}
                  aria-pressed={filter === category}
                  className={filter === category ? "selected" : ""}
                  onClick={() => {
                    setFilter(category);
                    setAiFilter("all");
                  }}
                >
                  {hall.key==='ai'&&category!=='all'?localize(aiCategoryOptions.find(option=>option.id===category)!.title,locale):t.has(`category.${category}`)
                    ? t(`category.${category}`)
                    : category}
                </button>
              ))}
            </div>
            {aiFilter !== "all" && (
              <button
                className="text-button"
                onClick={() => setAiFilter("all")}
              >
                {aiFilter} ×
              </button>
            )}
          </div>
          {hall.key === "ai" ? (
            <div className="portal-shelf">
              <ShelfLayout
                items={visible.map(asAi)}
                category="all"
                onOpen={(item, element) =>
                  open(
                    items.find((value) => keyOf(value) === item.id)!,
                    element,
                  )
                }
              />
            </div>
          ) : (
            <div className={`content-grid layout-${hall.key}`}>
              {visible.map((item) => (
                <article
                  className={`content-card card-${hall.key}`}
                  key={keyOf(item)}
                >
                  {item.type === "prompt" && (
                    <button
                      className="prompt-result-cover"
                      aria-label={t("viewResult", {
                        title: localize(item.title, locale),
                      })}
                      onClick={(event) => open(item, event.currentTarget)}
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
                        <MediaPreview alt={localize(item.title, locale)} />
                      )}
                      {!!item.data.resultMedia.length && (
                        <span className="media-count-badge">
                          {t("resultCount", {
                            count: item.data.resultMedia.length,
                          })}
                        </span>
                      )}
                    </button>
                  )}
                  <div className="card-meta">
                    {item.type === "prompt" ? (
                      <button
                        className="provider-tag"
                        onClick={() => setAiFilter(item.data.aiSlug)}
                      >
                        {aiItems.find((ai) => ai.id === item.data.aiSlug)
                          ?.name || item.data.aiSlug}
                      </button>
                    ) : (
                      <span className="tool-badge">
                        {item.type === "game" ? (
                          <Gamepad2 size={28} />
                        ) : (
                          <Shapes size={28} />
                        )}
                      </span>
                    )}
                    <button
                      className="icon-button favorite-button"
                      aria-pressed={favorites.includes(keyOf(item))}
                      aria-label={t("favorite")}
                      onClick={() => void toggleFavorite(item)}
                    >
                      <Star
                        size={20}
                        fill={
                          favorites.includes(keyOf(item))
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>
                  </div>
                  <button
                    className="content-open"
                    onClick={(event) => open(item, event.currentTarget)}
                  >
                    <h2>{localize(item.title, locale)}</h2>
                    <p>{localize(item.summary, locale)}</p>
                    {item.type === "prompt" &&
                      !!item.data.referenceImages.length && (
                        <span className="reference-count">
                          {t("referenceCount", {
                            count: item.data.referenceImages.length,
                          })}
                        </span>
                      )}
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
                    onClick={(event) => open(item, event.currentTarget)}
                  >
                    {t(
                      item.type === "prompt"
                        ? "usePrompt"
                        : item.type === "game"
                          ? "play"
                          : "openTool",
                    )}
                    <ArrowRight size={17} />
                  </button>
                </article>
              ))}
            </div>
          )}
          {!visible.length && (
            <div className="empty-state">
              <Sparkles size={32} />
              <h2>{t("empty")}</h2>
              <p>{t("emptyHint")}</p>
            </div>
          )}
          {error && (
            <div role="alert" className="notice error">
              {t(`errors.${error}`)}
              <button className="text-button" onClick={() => void load()}>
                {t("retry")}
              </button>
            </div>
          )}
          <div ref={sentinel} className="feed-sentinel">
            {busy ? (
              <span role="status">{t("loading")}</span>
            ) : cursor ? (
              <button className="outline-button" onClick={() => void load()}>
                {t("loadMore")}
              </button>
            ) : hall.key === "prompts" ? (
              <span>{t("allSeen")}</span>
            ) : null}
          </div>
          <Modal
            open={!!active}
            onClose={close}
            title={active ? localize(active.title, locale) : ""}
            description={active ? localize(active.summary, locale) : ""}
            returnFocus={focus}
            className={
              active?.type === "ai" ? "stage-panel" : "workbench-panel"
            }
          >
            {active && (
              <>
                <button
                  className="text-button modal-favorite"
                  aria-pressed={favorites.includes(keyOf(active))}
                  onClick={() => void toggleFavorite(active)}
                >
                  <Star
                    size={17}
                    fill={
                      favorites.includes(keyOf(active))
                        ? "currentColor"
                        : "none"
                    }
                  />
                  {t("favorite")}
                </button>
                {active.type === "ai" ? (
                  <AiStage item={asAi(active)} />
                ) : (
                  <div className="workbench">
                    {active.type !== "tool" && (
                      <span className="eyebrow">
                        {t(`hallEyebrow.${hall.key}`)}
                      </span>
                    )}
                    <h2>{localize(active.title, locale)}</h2>
                    <p>{localize(active.summary, locale)}</p>
                    <Suspense fallback={<p role="status">{t("loading")}</p>}>
                      {active.type === "prompt" ? (
                        <PromptWorkbench item={active} />
                      ) : active.type === "tool" ? (
                        (() => {
                          const Tool = toolRegistry[active.data.toolKey];
                          return <Tool key={keyOf(active)} item={active} />;
                        })()
                      ) : (
                        (() => {
                          const Game = gameRegistry[active.data.gameKey];
                          return <Game key={keyOf(active)} item={active} />;
                        })()
                      )}
                    </Suspense>
                    <p className="privacy-note">{t("privacy")}</p>
                    <button className="text-button" onClick={close}>
                      {t("close")}
                    </button>
                  </div>
                )}
              </>
            )}
          </Modal>
        </LayoutGroup>
      </MotionConfig>
    </PortalShell>
  );
}
export function PromptWorkbench({ item }: { item: PortalItem & { type: "prompt" } }) {
  const locale = useLocale(),
    t = useTranslations("portal"),
    [values, setValues] = useState<Record<string, string>>({}),
    [status, setStatus] = useState("");
  const text = localize(item.data.text, locale).replace(
    /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g,
    (match, key) => values[key] || match,
  );
  const provider = aiItems.find((ai) => ai.id === item.data.aiSlug)!;
  const mobile=useMobilePlatform(),mobileHref=mobileAppHref(provider,mobile);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("errors.copyFailed");
    }
  }
  return (
    <div className="prompt-workbench">
      <MediaGallery assets={item.data.resultMedia} />
      <ReferenceImages assets={item.data.referenceImages} />
      <h3>{t("promptText")}</h3>
      {item.data.variables.map((variable) => (
        <label key={variable.key}>
          {localize(variable.label, locale)}
          <input
            value={values[variable.key] || ""}
            onChange={(event) =>
              setValues({ ...values, [variable.key]: event.target.value })
            }
          />
        </label>
      ))}
      <pre>{text}</pre>
      {item.data.resultText && (
        <details>
          <summary>{t("exampleResult")}</summary>
          <p>{localize(item.data.resultText, locale)}</p>
        </details>
      )}
      <div className="button-row">
        <button className="pill-button" onClick={() => void copy()}>
          <Copy size={17} />
          {t("copy")}
        </button>
        <a
          className="outline-button"
          href={mobileHref||provider.url}
          target={mobileHref?undefined:"_blank"}
          rel="noopener noreferrer"
          onClick={() => void copy()}
        >
          {t("openProvider", { name: provider.name })}
          <ArrowUpRight size={17} />
        </a>
      </div>
      <p>{t("pasteHint")}</p>
      <p role="status">{status ? t(status) : ""}</p>
    </div>
  );
}
