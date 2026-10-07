"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
export default function PromptBuilder() {
  const t = useTranslations("portal");
  const [goal, setGoal] = useState(""),
    [audience, setAudience] = useState(""),
    [tone, setTone] = useState("friendly"),
    [format, setFormat] = useState("paragraph"),
    [status, setStatus] = useState("");
  const output = goal
    ? t("builderResult", {
        goal,
        audience: audience || t("everyone"),
        tone: t(`tone.${tone}`),
        format: t(`format.${format}`),
      })
    : "";
  return (
    <div className="tool-form">
      <label>
        {t("goal")}
        <input
          value={goal}
          maxLength={1000}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={t("goalPlaceholder")}
        />
      </label>
      <label>
        {t("audience")}
        <input
          value={audience}
          maxLength={200}
          onChange={(e) => setAudience(e.target.value)}
          placeholder={t("audiencePlaceholder")}
        />
      </label>
      <div className="form-columns">
        <label>
          {t("toneLabel")}
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            {["friendly", "formal", "simple"].map((key) => (
              <option key={key} value={key}>
                {t(`tone.${key}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("formatLabel")}
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            {["paragraph", "bullets", "table"].map((key) => (
              <option key={key} value={key}>
                {t(`format.${key}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <pre className="tool-output">{output || t("builderEmpty")}</pre>
      <div className="button-row">
        <button
          className="pill-button"
          disabled={!output}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(output);
              setStatus("copied");
            } catch {
              setStatus("errors.copyFailed");
            }
          }}
        >
          {t("copy")}
        </button>
        <button
          className="outline-button"
          onClick={() => {
            setGoal("");
            setAudience("");
            setStatus("");
          }}
        >
          {t("reset")}
        </button>
      </div>
      <p role="status">{status ? t(status) : ""}</p>
    </div>
  );
}
