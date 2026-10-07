"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
export default function CharCount() {
  const t = useTranslations("portal"),
    locale = useLocale(),
    [text, setText] = useState("");
  const segmenter = new Intl.Segmenter(locale, { granularity: "grapheme" });
  const characters = [...segmenter.segment(text)].map((value) => value.segment);
  return (
    <div className="tool-form">
      <label>
        {t("yourText")}
        <textarea
          rows={7}
          maxLength={100000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("textPlaceholder")}
        />
      </label>
      <dl className="stat-grid">
        <div>
          <dt>{t("withSpaces")}</dt>
          <dd>{characters.length.toLocaleString(locale)}</dd>
        </div>
        <div>
          <dt>{t("withoutSpaces")}</dt>
          <dd>
            {characters
              .filter((value) => !/^\s+$/.test(value))
              .length.toLocaleString(locale)}
          </dd>
        </div>
        <div>
          <dt>{t("words")}</dt>
          <dd>{text.trim() ? text.trim().split(/\s+/).length : 0}</dd>
        </div>
        <div>
          <dt>{t("manuscript")}</dt>
          <dd>{Math.ceil(characters.length / 200)}</dd>
        </div>
      </dl>
      <button className="outline-button" onClick={() => setText("")}>
        {t("reset")}
      </button>
      <p>{t("localOnly")}</p>
    </div>
  );
}
