"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { localize, type PortalItem } from "@/lib/schema";
import { useBestScore } from "./scores";
export default function AiQuiz({
  item,
}: {
  item: PortalItem & { type: "game" };
}) {
  const t = useTranslations("portal"),
    locale = useLocale(),
    questions = item.data.questions || [],
    [index, setIndex] = useState(0),
    [answer, setAnswer] = useState<number | null>(null),
    [score, setScore] = useState(0),
    [done, setDone] = useState(false);
  const { best, save } = useBestScore(
    `quiz-${item.orgId || "common"}-${item.id}`,
  );
  if (!questions.length) return <p>{t("empty")}</p>;
  const current = questions[index];
  function choose(value: number) {
    if (answer !== null) return;
    setAnswer(value);
    if (value === current.answer) setScore((s) => s + 1);
  }
  function next() {
    if (index + 1 === questions.length) {
      setDone(true);
      save(score);
    } else {
      setIndex((i) => i + 1);
      setAnswer(null);
    }
  }
  return (
    <div className="game-workbench">
      <div className="game-score">
        <span>
          {t("quizProgress", { current: index + 1, total: questions.length })}
        </span>
        <span>{t("bestScore", { count: best })}</span>
      </div>
      {done ? (
        <>
          <h3>{t("quizResult", { score, total: questions.length })}</h3>
          <button
            className="pill-button"
            onClick={() => {
              setIndex(0);
              setScore(0);
              setAnswer(null);
              setDone(false);
            }}
          >
            {t("restart")}
          </button>
        </>
      ) : (
        <>
          <h3>{localize(current.question, locale)}</h3>
          <div className="quiz-options">
            {current.options.map((option, i) => (
              <button
                className={
                  answer !== null && i === current.answer ? "correct" : ""
                }
                aria-pressed={answer === i}
                disabled={answer !== null}
                key={i}
                onClick={() => choose(i)}
              >
                <span>{i + 1}</span>
                {localize(option, locale)}
              </button>
            ))}
          </div>
          {answer !== null && (
            <>
              <p role="status">
                {t(answer === current.answer ? "correct" : "incorrect")}
              </p>
              <button className="pill-button" onClick={next}>
                {t(
                  index + 1 === questions.length ? "seeScore" : "nextQuestion",
                )}
              </button>
            </>
          )}
        </>
      )}
      <p>{t("scoreLocal")}</p>
    </div>
  );
}
