"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { localize, type PortalItem } from "@/lib/schema";
export default function TemplateFill({
  item,
}: {
  item: PortalItem & { type: "tool" };
}) {
  const t = useTranslations("portal"),
    locale = useLocale(),
    [values, setValues] = useState<Record<string, string>>({}),
    [status, setStatus] = useState("");
  const template = item.data.template
    ? localize(item.data.template, locale)
    : (t.raw("defaultTemplate") as string);
  const keys = Array.from(
    new Set(
      [...template.matchAll(/\{\{([^{}]+)\}\}/g)].map((match) => match[1]),
    ),
  );
  const output = template.replace(
    /\{\{([^{}]+)\}\}/g,
    (match, key) => values[key] || match,
  );
  return (
    <div className="tool-form">
      {keys.map((key) => (
        <label key={key}>
          {key}
          <input
            maxLength={2000}
            value={values[key] || ""}
            onChange={(e) => setValues({ ...values, [key]: e.target.value })}
          />
        </label>
      ))}
      <pre className="tool-output">{output}</pre>
      <div className="button-row">
        <button
          className="pill-button"
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
            setValues({});
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
