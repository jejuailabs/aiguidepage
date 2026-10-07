"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Monitor,
  Smartphone,
  QrCode,
  Download,
  Copy,
  Check,
} from "lucide-react";
import { Modal } from "@/components/shell/modal";
import { useMobilePlatform } from "@/lib/use-mobile-platform";
import { shareSiteUrl } from "@/lib/site-url";
import { useInstall } from "./install-provider";

export function ShortcutActions() {
  const t = useTranslations("shortcuts"),
    locale = useLocale(),
    mobile = useMobilePlatform(),
    install = useInstall();
  const [panel, setPanel] = useState<"install" | "qr" | null>(null),
    [qr, setQr] = useState(""),
    [status, setStatus] = useState("");
  const focus = useRef<HTMLElement | null>(null),
    url = shareSiteUrl(locale);
  async function addShortcut(element: HTMLElement) {
    focus.current = element;
    setStatus("");
    if (mobile && install.prompt) {
      const prompt = install.prompt;
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") setStatus("installing");
      } catch {
        setPanel("install");
      } finally {
        install.clearPrompt();
      }
    } else setPanel("install");
  }
  async function openQr(element: HTMLElement) {
    focus.current = element;
    setPanel("qr");
    setStatus("");
    setQr("");
    try {
      const { default: QRCode } = await import("qrcode");
      setQr(
        await QRCode.toDataURL(url, {
          width: 768,
          margin: 3,
          errorCorrectionLevel: "M",
        }),
      );
    } catch {
      setStatus("qrFailed");
    }
  }
  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("copyFailed");
    }
  }
  return (
    <>
      <div className="shortcut-actions">
        {mobile ? (
          <button
            className="shortcut-button"
            disabled={install.installed}
            onClick={(event) => void addShortcut(event.currentTarget)}
          >
            {mobile ? <Smartphone size={18} /> : <Monitor size={18} />}
            <span>
              {t(
                install.installed
                  ? "installed"
                  : mobile
                    ? "addHome"
                    : "addDesktop",
              )}
            </span>
          </button>
        ) : (
          <a
            className="shortcut-button"
            href={url}
            draggable
            title={t("dragShortcut")}
            onClick={(event) => {
              event.preventDefault();
              focus.current = event.currentTarget;
              setPanel("install");
              setStatus("");
            }}
          >
            <Monitor size={18} />
            <span>{t("addDesktop")}</span>
          </a>
        )}
        <button
          className="shortcut-button"
          onClick={(event) => void openQr(event.currentTarget)}
        >
          <QrCode size={18} />
          <span>{t(mobile ? "shareQr" : "openOnPhone")}</span>
        </button>
        {status === "installing" && !install.installed && (
          <span role="status">{t("installing")}</span>
        )}
      </div>
      <Modal
        open={panel !== null}
        onClose={() => {
          setPanel(null);
          setStatus("");
        }}
        title={t(panel === "qr" ? "qrTitle" : "installTitle")}
        description={t(panel === "qr" ? "qrDescription" : "installDescription")}
        className="shortcut-panel"
        returnFocus={focus}
      >
        <div className="shortcut-content">
          <div className="shortcut-brand">
            <Image src="/icons/icon-192.png" width={72} height={72} alt="" />
            <div>
              <h2>{t(panel === "qr" ? "qrTitle" : "installTitle")}</h2>
              <p>{t("name")}</p>
            </div>
          </div>
          {panel === "qr" ? (
            <>
              <p>{t("qrDescription")}</p>
              <div className="site-qr">
                {qr ? (
                  <Image
                    src={qr}
                    width={256}
                    height={256}
                    alt={t("qrAlt")}
                    unoptimized
                  />
                ) : (
                  <p role="status">
                    {t(status === "qrFailed" ? "qrFailed" : "loadingQr")}
                  </p>
                )}
              </div>
              <p className="shortcut-url">{url}</p>
              <div className="button-row">
                {qr && (
                  <a
                    className="pill-button"
                    href={qr}
                    download="AI-gallery-QR.png"
                  >
                    <Download size={17} />
                    {t("saveQr")}
                  </a>
                )}
                <button
                  className="outline-button"
                  onClick={() => void copyUrl()}
                >
                  {status === "copied" ? (
                    <Check size={17} />
                  ) : (
                    <Copy size={17} />
                  )}{" "}
                  {t(status === "copied" ? "copied" : "copyUrl")}
                </button>
              </div>
              {(status === "copied" || status === "copyFailed") && (
                <p role="status">{t(status)}</p>
              )}
            </>
          ) : (
            <>
              <p>{t("installDescription")}</p>
              {!mobile && (
                <a
                  className="shortcut-button"
                  href={url}
                  draggable
                  onClick={(event) => event.preventDefault()}
                >
                  <Monitor size={18} />
                  {t("dragShortcut")}
                </a>
              )}
              <ol className="install-steps">
                {(mobile === "ios"
                  ? ["iosStep1", "iosStep2", "iosStep3"]
                  : mobile === "android"
                    ? ["androidStep1", "androidStep2", "androidStep3"]
                    : ["desktopStep1", "desktopStep2", "desktopStep3"]
                ).map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ol>
              <p className="shortcut-help">
                {t(
                  mobile === "ios"
                    ? "iosHint"
                    : mobile === "android"
                      ? "androidHint"
                      : "desktopHint",
                )}
              </p>
              {!mobile && (
                <div className="button-row">
                  <a
                    className="pill-button"
                    href={`/api/shortcut?locale=${locale}`}
                    download={
                      locale === "ko" ? "AI 전시관.url" : "AI Gallery.url"
                    }
                  >
                    <Download size={17} />
                    {t("saveShortcut")}
                  </a>
                  <a
                    className="outline-button"
                    href="/icons/favicon.ico"
                    download="AI-gallery.ico"
                  >
                    <Download size={17} />
                    {t("saveIcon")}
                  </a>
                </div>
              )}
              <button className="outline-button" onClick={() => void copyUrl()}>
                <Copy size={17} />
                {t(status === "copied" ? "copied" : "copyUrl")}
              </button>
              {(status === "copied" || status === "copyFailed") && (
                <p role="status">{t(status)}</p>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
