"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  FileUp,
  LoaderCircle,
  Mic,
  Square,
  X,
} from "lucide-react";
import { maisaTools, planQuestions } from "@/lib/maisa-tools";
import {
  displayResult,
  receiptKeys,
  receiptsCsv,
  resultLabel,
  resultText,
} from "@/lib/maisa-results";
import type { PortalItem } from "@/lib/schema";

type SpeechSession = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type SpeechConstructor = new () => SpeechSession;
function saveFile(name: string, blob: Blob) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
export default function MaisaTool({
  item,
}: {
  item: PortalItem & { type: "tool" };
}) {
  const t = useTranslations("maisa"),
    locale = useLocale(),
    language = locale === "en" ? "en" : "ko",
    id = useId();
  const definition = maisaTools.find((tool) => tool.key === item.data.toolKey)!;
  const [text, setText] = useState(""),
    [files, setFiles] = useState<File[]>([]),
    [template, setTemplate] = useState("notice"),
    [style, setStyle] = useState("formal"),
    [consent, setConsent] = useState(false),
    [running, setRunning] = useState(false),
    [result, setResult] = useState<Record<string, unknown> | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [login, setLogin] = useState(false);
  const [answers, setAnswers] = useState<string[]>(Array(8).fill("")),
    [step, setStep] = useState(0),
    [basics, setBasics] = useState({
      group: "",
      title: "",
      grant: "",
      contribution: "",
    }),
    [listening, setListening] = useState(false);
  const speech = useRef<SpeechSession | null>(null),
    abort = useRef<AbortController | null>(null),
    fileInput = useRef<HTMLInputElement | null>(null);
  // Restore the per-tab draft when the user returns from this site's login.
  /* eslint-disable react-hooks/set-state-in-effect -- sessionStorage is browser-only; restore the draft once after hydration. */
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`maisa-draft:${item.id}`);
      if (!stored) return;
      const value = JSON.parse(stored);
      if (typeof value.text === "string") setText(value.text.slice(0, 12000));
      if (
        Array.isArray(value.answers) &&
        value.answers.length === 8 &&
        value.answers.every((entry: unknown) => typeof entry === "string")
      )
        setAnswers(value.answers.map((entry: string) => entry.slice(0, 2000)));
      if (
        value.basics &&
        Object.values(value.basics).every((entry) => typeof entry === "string")
      )
        setBasics(value.basics);
      if (
        ["notice", "application", "report", "minutes", "plan"].includes(
          value.template,
        )
      )
        setTemplate(value.template);
      if (["formal", "friendly", "cheerful"].includes(value.style))
        setStyle(value.style);
      sessionStorage.removeItem(`maisa-draft:${item.id}`);
    } catch {}
  }, [item.id]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(
    () => () => {
      speech.current?.abort();
      abort.current?.abort();
    },
    [],
  );
  function stopVoice() {
    speech.current?.stop();
    setListening(false);
  }
  function voice() {
    if (listening) {
      stopVoice();
      return;
    }
    const source = window as unknown as {
      SpeechRecognition?: SpeechConstructor;
      webkitSpeechRecognition?: SpeechConstructor;
    };
    const Constructor =
      source.SpeechRecognition || source.webkitSpeechRecognition;
    if (!Constructor) {
      setError(t("voiceUnavailable"));
      return;
    }
    const recognition = new Constructor();
    recognition.lang = language === "en" ? "en-US" : "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = false;
    const original = answers[step];
    recognition.onresult = (event) => {
      const addition = Array.from(event.results)
        .map((entry) => entry[0].transcript)
        .join(" ");
      setAnswers((current) =>
        current.map((value, index) =>
          index === step
            ? `${original} ${addition}`.trim().slice(0, 2000)
            : value,
        ),
      );
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setError(t("voiceUnavailable"));
      setListening(false);
    };
    speech.current = recognition;
    setError("");
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError(t("voiceUnavailable"));
    }
  }
  function chooseFiles(chosen: File[]) {
    setError("");
    if (chosen.length > (definition.slug === "receipt" ? 3 : 1)) {
      setError(t("errors.fileCount"));
      return;
    }
    if (
      chosen.some((file) => !file.size) ||
      chosen.reduce((sum, file) => sum + file.size, 0) > 4 * 1024 * 1024
    ) {
      setError(t("errors.fileTooLarge"));
      return;
    }
    if (
      chosen.some((file) => !definition.accept.split(",").includes(file.type))
    ) {
      setError(t("errors.invalidFile"));
      return;
    }
    setFiles(chosen);
  }
  async function run() {
    stopVoice();
    setRunning(true);
    setError("");
    setNotice("");
    setLogin(false);
    setResult(null);
    try {
      const controller = new AbortController();
      abort.current = controller;
      const input = {
        consent,
        locale: language,
        itemId: item.id,
        scope: item.scope,
        ...(item.orgId ? { orgId: item.orgId } : {}),
        text,
        template,
        style,
        answers,
        basics,
      };
      let body: BodyInit;
      const headers: Record<string, string> = { "X-Requested-With": "aiguide" };
      if (definition.kind === "file") {
        const form = new FormData();
        form.set("input", JSON.stringify(input));
        files.forEach((file) => form.append("files", file));
        body = form;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(input);
      }
      const response = await fetch(`/api/ai-tools/${definition.slug}`, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      const payload = await response
        .json()
        .catch(() => ({ error: "processingFailed" }));
      if (!response.ok || !payload.result) {
        if (response.status === 401) setLogin(true);
        throw new Error(payload.error || "processingFailed");
      }
      setResult(payload.result);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      const code = cause instanceof Error ? cause.message : "processingFailed";
      setError(
        t.has(`errors.${code}`)
          ? t(`errors.${code}`)
          : t("errors.processingFailed"),
      );
    } finally {
      setRunning(false);
    }
  }
  function download() {
    if (!result) return;
    if (definition.slug === "receipt" && Array.isArray(result.items))
      saveFile(
        "영수증-장부.csv",
        new Blob([receiptsCsv(result.items, locale)], {
          type: "text/csv;charset=utf-8",
        }),
      );
    else if (typeof result.audioBase64 === "string")
      saveFile(
        "안내-음성.mp3",
        new Blob(
          [
            Uint8Array.from(atob(result.audioBase64), (char) =>
              char.charCodeAt(0),
            ),
          ],
          { type: "audio/mpeg" },
        ),
      );
    else
      saveFile(
        `${definition.title[language]}.txt`,
        new Blob([resultText(result, locale)], {
          type: "text/plain;charset=utf-8",
        }),
      );
  }
  const canRun =
    consent &&
    (definition.kind === "file"
      ? files.length > 0
      : definition.kind === "plan"
        ? answers.some((answer) => answer.trim())
        : !!text.trim());
  return (
    <div className="maisa-tool">
      <p className="maisa-source">{t("source")}</p>
      {definition.kind === "plan" ? (
        <>
          <div className="maisa-basics">
            <label>
              {t("group")}
              <input
                value={basics.group}
                maxLength={100}
                onChange={(event) =>
                  setBasics({ ...basics, group: event.target.value })
                }
              />
            </label>
            <label>
              {t("projectTitle")}
              <input
                value={basics.title}
                maxLength={100}
                onChange={(event) =>
                  setBasics({ ...basics, title: event.target.value })
                }
              />
            </label>
          </div>
          <div className="maisa-step">
            <span>{t("question", { current: step + 1, total: 8 })}</span>
            <progress max={8} value={step + 1} />
          </div>
          <label htmlFor={`${id}-answer`}>
            {planQuestions[step][language]}
          </label>
          <textarea
            id={`${id}-answer`}
            value={answers[step]}
            maxLength={2000}
            rows={5}
            onChange={(event) => {
              stopVoice();
              setAnswers((current) =>
                current.map((value, index) =>
                  index === step ? event.target.value : value,
                ),
              );
            }}
          />
          <div className="maisa-actions">
            <button
              className="outline-button"
              type="button"
              aria-pressed={listening}
              onClick={voice}
            >
              {listening ? <Square size={17} /> : <Mic size={17} />}{" "}
              {t(listening ? "stopVoice" : "voice")}
            </button>
            <span>{answers[step].length} / 2,000</span>
          </div>
          <div className="maisa-actions">
            <button
              type="button"
              className="outline-button"
              disabled={step === 0}
              onClick={() => {
                stopVoice();
                setStep(step - 1);
              }}
            >
              <ArrowLeft size={17} />
              {t("previous")}
            </button>
            <button
              type="button"
              className="outline-button"
              disabled={step === 7}
              onClick={() => {
                stopVoice();
                setStep(step + 1);
              }}
            >
              {t("next")}
              <ArrowRight size={17} />
            </button>
          </div>
          <div className="maisa-basics">
            <label>
              {t("grant")}
              <input
                inputMode="numeric"
                value={basics.grant}
                maxLength={10}
                onChange={(event) =>
                  setBasics({
                    ...basics,
                    grant: event.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </label>
            <label>
              {t("contribution")}
              <input
                inputMode="numeric"
                value={basics.contribution}
                maxLength={10}
                onChange={(event) =>
                  setBasics({
                    ...basics,
                    contribution: event.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </label>
          </div>
          <p className="maisa-help">{t("planHint")}</p>
        </>
      ) : definition.kind === "text" ? (
        <>
          <label htmlFor={`${id}-text`}>
            {t(definition.slug === "narration" ? "announcementText" : "draft")}
          </label>
          <textarea
            id={`${id}-text`}
            rows={8}
            value={text}
            maxLength={definition.slug === "narration" ? 3500 : 12000}
            onChange={(event) => setText(event.target.value)}
          />
          {definition.slug === "format" ? (
            <label>
              {t("template")}
              <select
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
              >
                {["notice", "application", "report", "minutes", "plan"].map(
                  (value) => (
                    <option key={value} value={value}>
                      {t(`templates.${value}`)}
                    </option>
                  ),
                )}
              </select>
            </label>
          ) : (
            <label>
              {t("style")}
              <select
                value={style}
                onChange={(event) => setStyle(event.target.value)}
              >
                {["formal", "friendly", "cheerful"].map((value) => (
                  <option key={value} value={value}>
                    {t(`styles.${value}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      ) : (
        <>
          <label
            className="maisa-upload"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!running) chooseFiles(Array.from(event.dataTransfer.files));
            }}
          >
            <FileUp size={28} />
            <strong>
              {t(
                definition.slug === "transcribe"
                  ? "chooseAudio"
                  : definition.slug === "receipt"
                    ? "chooseReceipts"
                    : "chooseDocument",
              )}
            </strong>
            <span>
              {t(
                definition.slug === "transcribe"
                  ? "audioTypes"
                  : definition.slug === "receipt"
                    ? "receiptTypes"
                    : "documentTypes",
              )}
            </span>
            <input
              ref={fileInput}
              type="file"
              aria-label={t("chooseFiles")}
              accept={definition.accept}
              multiple={definition.slug === "receipt"}
              disabled={running}
              onChange={(event) => {
                chooseFiles(Array.from(event.target.files || []));
                event.target.value = "";
              }}
            />
          </label>
          <ul className="maisa-files">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                <span>{file.name}</span>
                <small>{(file.size / 1024 / 1024).toFixed(1)} MB</small>
                <button
                  type="button"
                  className="icon-button"
                  disabled={running}
                  aria-label={t("removeFile", { name: file.name })}
                  onClick={() =>
                    setFiles((current) => current.filter((_, i) => i !== index))
                  }
                >
                  <X size={17} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <label className="maisa-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>{t("consent")}</span>
      </label>
      <button
        type="button"
        className="pill-button maisa-run"
        disabled={running || !canRun}
        onClick={run}
      >
        {running ? (
          <LoaderCircle size={19} className="maisa-spin" />
        ) : (
          <ArrowRight size={18} />
        )}{" "}
        {t(running ? "running" : "run")}
      </button>
      {running && <p role="status">{t("runningHint")}</p>}
      {error && (
        <p className="maisa-error" role="alert">
          {error}
        </p>
      )}
      {login && (
        <Link
          className="outline-button"
          onClick={() => {
            try {
              sessionStorage.setItem(
                `maisa-draft:${item.id}`,
                JSON.stringify({ text, answers, basics, template, style }),
              );
            } catch {}
          }}
          href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/tools?tool=${item.id}`)}`}
        >
          {t("login")}
        </Link>
      )}
      {notice && <p role="status">{notice}</p>}
      {result && (
        <section className="maisa-result" aria-label={t("result")}>
          <h3>
            <Check size={20} />
            {t("result")}
          </h3>
          {typeof result.audioBase64 === "string" && (
            <>
              <audio
                controls
                src={`data:audio/mpeg;base64,${result.audioBase64}`}
              />
              <p className="maisa-help">{t("aiVoice")}</p>
            </>
          )}
          {Array.isArray(result.items) && (
            <div className="maisa-table">
              <table>
                <thead>
                  <tr>
                    {receiptKeys.map((key) => (
                      <th key={key}>{resultLabel(key, locale)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(result.items as Record<string, unknown>[]).map(
                    (row, index) => (
                      <tr key={index}>
                        {receiptKeys.map((key) => (
                          <td key={key}>{displayResult(row[key], locale)}</td>
                        ))}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
          {Object.entries(result)
            .filter(
              ([key]) =>
                ![
                  "items",
                  "audioBase64",
                  "audioMimeType",
                  "transcript",
                ].includes(key),
            )
            .map(([key, value]) => (
              <div key={key}>
                <h4>{resultLabel(key, locale)}</h4>
                <pre>{displayResult(value, locale)}</pre>
              </div>
            ))}
          {typeof result.transcript === "string" && (
            <details>
              <summary>{t("transcript")}</summary>
              <pre>{result.transcript}</pre>
            </details>
          )}
          <div className="maisa-actions">
            <button type="button" className="pill-button" onClick={download}>
              <Download size={17} />
              {t(
                definition.slug === "receipt"
                  ? "downloadCsv"
                  : definition.slug === "narration"
                    ? "downloadAudio"
                    : "download",
              )}
            </button>
            <button
              type="button"
              className="outline-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    resultText(result, locale),
                  );
                  setNotice(t("copied"));
                } catch {
                  setError(t("copyFailed"));
                }
              }}
            >
              <Copy size={17} />
              {t("copy")}
            </button>
          </div>
          <p className="maisa-help">{t("checkResult")}</p>
        </section>
      )}
    </div>
  );
}
