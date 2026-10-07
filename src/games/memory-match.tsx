"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { aiItems } from "@/data/ai";
import { useBestScore } from "./scores";
export default function MemoryMatch() {
  const t = useTranslations("portal"),
    [pairs, setPairs] = useState(4),
    [deck, setDeck] = useState<number[]>([]),
    [open, setOpen] = useState<number[]>([]),
    [matched, setMatched] = useState<number[]>([]),
    [moves, setMoves] = useState(0),
    [started, setStarted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { best, save } = useBestScore(`memory-${pairs}`);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function start() {
    if (timer.current) clearTimeout(timer.current);
    const cards = Array.from({ length: pairs * 2 }, (_, i) =>
      Math.floor(i / 2),
    );
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    setDeck(cards);
    setOpen([]);
    setMatched([]);
    setMoves(0);
    setStarted(true);
  }
  function flip(index: number) {
    if (
      open.length === 2 ||
      open.includes(index) ||
      matched.includes(deck[index])
    )
      return;
    const next = [...open, index];
    setOpen(next);
    if (next.length === 2) {
      setMoves((value) => value + 1);
      if (deck[next[0]] === deck[next[1]]) {
        const done = [...matched, deck[index]];
        setMatched(done);
        setOpen([]);
        if (done.length === pairs) save(moves + 1, true);
      } else
        timer.current = setTimeout(() => {
          setOpen([]);
          timer.current = null;
        }, 850);
    }
  }
  return (
    <div className="game-workbench">
      <div className="button-row">
        <label>
          {t("difficulty")}
          <select
            value={pairs}
            onChange={(e) => {
              setPairs(Number(e.target.value));
              setStarted(false);
              if (timer.current) clearTimeout(timer.current);
            }}
          >
            {[3, 4, 6].map((n, i) => (
              <option key={n} value={n}>
                {t(["easy", "medium", "hard"][i])}
              </option>
            ))}
          </select>
        </label>
        <button className="pill-button" onClick={start}>
          {t(started ? "restart" : "startGame")}
        </button>
      </div>
      <div className="game-score">
        <span>{t("moves", { count: moves })}</span>
        <span>{t("bestMoves", { count: best })}</span>
      </div>
      {started && (
        <div className="memory-grid">
          {deck.map((value, index) => {
            const revealed = open.includes(index) || matched.includes(value),
              ai = aiItems[value];
            return (
              <button
                className={`memory-card ${revealed ? "revealed" : ""}`}
                key={index}
                onClick={() => flip(index)}
                disabled={matched.includes(value)}
                aria-label={
                  revealed ? ai.name : t("hiddenCard", { number: index + 1 })
                }
                aria-pressed={revealed}
              >
                {revealed ? (
                  <Image
                    src={`/brands/${ai.logo}`}
                    alt={ai.name}
                    width={54}
                    height={54}
                    unoptimized
                  />
                ) : (
                  <span aria-hidden="true">✦</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {started && matched.length === pairs && (
        <p className="notice success" role="status">
          {t("memoryWin", { count: moves })}
        </p>
      )}
      <p>{t("scoreLocal")}</p>
    </div>
  );
}
