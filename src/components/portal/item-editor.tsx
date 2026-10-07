"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { contentSchema, type Content, type PortalItem } from "@/lib/schema";
import { aiItems } from "@/data/ai";
import { api, ApiError } from "@/lib/client-api";

const emptyText = { ko: "", en: "" };
export function ItemEditor({
  item,
  endpoint,
  common,
  onSaved,
  onCancel,
}: {
  item?: PortalItem;
  endpoint: string;
  common: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("portal");
  const [type, setType] = useState<Content["type"]>(item?.type || "prompt"),
    [title, setTitle] = useState(item?.title || emptyText),
    [summary, setSummary] = useState(item?.summary || emptyText),
    [category, setCategory] = useState(item?.category || "work"),
    [order, setOrder] = useState(item?.order || 0),
    [status, setStatus] = useState(item?.status || "published"),
    [isPublic, setPublic] = useState(item?.public || false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [url, setUrl] = useState(item?.type === "ai" ? item.data.url : ""),
    [aiId, setAiId] = useState(item?.type === "ai" ? item.data.aiId || "" : ""),
    [description, setDescription] = useState(
      item?.type === "ai" ? item.data.description : emptyText,
    ),
    [features, setFeatures] = useState(
      item?.type === "ai"
        ? {
            ko: item.data.features.ko.join("\n"),
            en: item.data.features.en.join("\n"),
          }
        : emptyText,
    ),
    [aiPrompt, setAiPrompt] = useState(
      item?.type === "ai" ? item.data.prompt : emptyText,
    );
  const [provider, setProvider] = useState(
      item?.type === "prompt" ? item.data.aiSlug : "chatgpt",
    ),
    [text, setText] = useState(
      item?.type === "prompt" ? item.data.text : emptyText,
    );
  const [toolKey, setToolKey] = useState(
      item?.type === "tool" ? item.data.toolKey : "prompt-builder",
    ),
    [template, setTemplate] = useState(
      item?.type === "tool" ? item.data.template || emptyText : emptyText,
    );
  const [gameKey, setGameKey] = useState(
      item?.type === "game" ? item.data.gameKey : "memory-match",
    ),
    [questions, setQuestions] = useState(
      item?.type === "game" ? item.data.questions || [] : [],
    );
  const l10n = (
    label: string,
    value: { ko: string; en: string },
    set: (value: { ko: string; en: string }) => void,
    multiline = false,
  ) => (
    <fieldset className="localized-fields">
      <legend>{t(label)}</legend>
      {(["ko", "en"] as const).map((locale) => (
        <label key={locale}>
          <span>{locale === "ko" ? t("korean") : t("english")}</span>
          {multiline ? (
            <textarea
              rows={3}
              value={value[locale]}
              maxLength={10000}
              onChange={(e) => set({ ...value, [locale]: e.target.value })}
            />
          ) : (
            <input
              value={value[locale]}
              maxLength={300}
              onChange={(e) => set({ ...value, [locale]: e.target.value })}
            />
          )}
        </label>
      ))}
    </fieldset>
  );
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (status === "archived" && !window.confirm(t("archiveConfirm"))) return;
    setBusy(true);
    try {
      const base = {
        type,
        title,
        summary,
        category,
        order,
        status,
        public: common && isPublic,
      };
      let data;
      if (type === "ai")
        data = {
          url,
          aiId: aiId || undefined,
          description,
          features: {
            ko: features.ko.split("\n").filter(Boolean),
            en: features.en.split("\n").filter(Boolean),
          },
          prompt: aiPrompt,
        };
      if (type === "prompt") {
        const keys = Array.from(
          new Set(
            [
              ...`${text.ko} ${text.en}`.matchAll(
                /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g,
              ),
            ].map((match) => match[1]),
          ),
        );
        data = {
          aiSlug: provider,
          text,
          variables: keys.map(
            (key) =>
              (item?.type === "prompt"
                ? item.data.variables.find((variable) => variable.key === key)
                : undefined) || { key, label: { ko: key, en: key } },
          ),
          ...(item?.type === "prompt" && item.data.resultText
            ? { resultText: item.data.resultText }
            : {}),
        };
      }
      if (type === "tool")
        data = {
          toolKey,
          ...(toolKey === "template-fill" ? { template } : {}),
        };
      if (type === "game")
        data = { gameKey, ...(gameKey === "ai-quiz" ? { questions } : {}) };
      const parsed = contentSchema.safeParse({ ...base, data });
      if (!parsed.success) {
        setError("invalid");
        return;
      }
      if (type === "game" && gameKey === "ai-quiz" && !questions.length) {
        setError("invalid");
        return;
      }
      await api(endpoint, parsed.data);
      onSaved();
    } catch (error) {
      setError(error instanceof ApiError ? error.code : "unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="editor-form" onSubmit={save}>
      <div className="section-heading">
        <h2>{t(item ? "editItem" : "addItem")}</h2>
        <button type="button" className="text-button" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
      <label>
        {t("contentType")}
        <select
          value={type}
          disabled={!!item}
          onChange={(e) => setType(e.target.value as Content["type"])}
        >
          {(["ai", "prompt", "tool", "game"] as const).map((type) => (
            <option key={type} value={type}>
              {t(`type.${type}`)}
            </option>
          ))}
        </select>
      </label>
      {l10n("title", title, setTitle)}
      {l10n("summary", summary, setSummary, true)}
      <div className="form-columns">
        <label>
          {t("categoryLabel")}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {[
              "chat",
              "search",
              "documents",
              "video",
              "music",
              "writing",
              "image",
              "work",
              "life",
              "utility",
              "brain",
            ].map((key) => (
              <option key={key} value={key}>
                {t(`category.${key}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("order")}
          <input
            type="number"
            min={0}
            max={100000}
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
          />
        </label>
        <label>
          {t("status")}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            {["draft", "published", "archived"].map((key) => (
              <option key={key} value={key}>
                {t(key)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {type === "ai" && (
        <>
          <label>
            {t("webAddress")}
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://"
            />
          </label>
          <label>
            {t("coverBrand")}
            <select value={aiId} onChange={(e) => setAiId(e.target.value)}>
              <option value="">{t("customBrand")}</option>
              {aiItems.map((ai) => (
                <option value={ai.id} key={ai.id}>
                  {ai.name}
                </option>
              ))}
            </select>
          </label>
          {l10n("description", description, setDescription, true)}
          {l10n("features", features, setFeatures, true)}
          {l10n("examplePrompt", aiPrompt, setAiPrompt, true)}
        </>
      )}
      {type === "prompt" && (
        <>
          <label>
            {t("providerLabel")}
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as typeof provider)}
            >
              {aiItems.map((ai) => (
                <option value={ai.id} key={ai.id}>
                  {ai.name}
                </option>
              ))}
            </select>
          </label>
          {l10n("promptText", text, setText, true)}
          <p className="field-hint">
            {t("variableHint")} <code>{"{{name}}"}</code>
          </p>
        </>
      )}
      {type === "tool" && (
        <>
          <label>
            {t("toolLabel")}
            <select
              value={toolKey}
              onChange={(e) => setToolKey(e.target.value as typeof toolKey)}
            >
              {[
                "prompt-builder",
                "char-count",
                "qr-maker",
                "template-fill",
              ].map((key) => (
                <option key={key} value={key}>
                  {t(`tool.${key}`)}
                </option>
              ))}
            </select>
          </label>
          {toolKey === "template-fill" && (
            <>
              {l10n("template", template, setTemplate, true)}
              <p>
                {t("variableHint")} <code>{"{{title}}"}</code>
              </p>
            </>
          )}
        </>
      )}
      {type === "game" && (
        <>
          <label>
            {t("gameLabel")}
            <select
              value={gameKey}
              onChange={(e) => setGameKey(e.target.value as typeof gameKey)}
            >
              {["memory-match", "ai-quiz"].map((key) => (
                <option key={key} value={key}>
                  {t(`game.${key}`)}
                </option>
              ))}
            </select>
          </label>
          {gameKey === "ai-quiz" && (
            <div className="question-editor">
              {questions.map((question, index) => (
                <fieldset key={index}>
                  <legend>{t("questionNumber", { number: index + 1 })}</legend>
                  {l10n("question", question.question, (value) =>
                    setQuestions(
                      questions.map((q, i) =>
                        i === index ? { ...q, question: value } : q,
                      ),
                    ),
                  )}
                  {question.options.map((option, n) => (
                    <div key={n}>
                      {l10n("answerOption", option, (value) =>
                        setQuestions(
                          questions.map((q, i) =>
                            i === index
                              ? {
                                  ...q,
                                  options: q.options.map((o, j) =>
                                    j === n ? value : o,
                                  ),
                                }
                              : q,
                          ),
                        ),
                      )}
                    </div>
                  ))}
                  <label>
                    {t("correctAnswer")}
                    <select
                      value={question.answer}
                      onChange={(e) =>
                        setQuestions(
                          questions.map((q, i) =>
                            i === index
                              ? { ...q, answer: Number(e.target.value) }
                              : q,
                          ),
                        )
                      }
                    >
                      {question.options.map((_, i) => (
                        <option value={i} key={i}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setQuestions(questions.filter((_, i) => i !== index))
                    }
                  >
                    {t("removeQuestion")}
                  </button>
                </fieldset>
              ))}
              <button
                type="button"
                className="outline-button"
                disabled={questions.length >= 30}
                onClick={() =>
                  setQuestions([
                    ...questions,
                    {
                      question: { ko: "", en: "" },
                      options: [
                        { ko: "", en: "" },
                        { ko: "", en: "" },
                        { ko: "", en: "" },
                      ],
                      answer: 0,
                    },
                  ])
                }
              >
                {t("addQuestion")}
              </button>
            </div>
          )}
        </>
      )}
      {common && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setPublic(e.target.checked)}
          />
          {t("publicItem")}
        </label>
      )}
      {error && (
        <p className="notice error" role="alert">
          {t(`errors.${error}`)}
        </p>
      )}
      <div className="button-row">
        <button className="pill-button" disabled={busy}>
          {t(busy ? "saving" : "save")}
        </button>
        <button type="button" className="outline-button" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
