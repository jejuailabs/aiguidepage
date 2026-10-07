"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import Image from "next/image";
export default function QrMaker() {
  const t = useTranslations("portal"),
    [url, setUrl] = useState(""),
    [image, setImage] = useState(""),
    [error, setError] = useState(false);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(false);
    try {
      const parsed = new URL(url);
      if (!["https:", "http:"].includes(parsed.protocol)) throw new Error();
      setImage(
        await QRCode.toDataURL(parsed.href, {
          width: 768,
          margin: 3,
          errorCorrectionLevel: "M",
        }),
      );
    } catch {
      setError(true);
      setImage("");
    }
  }
  return (
    <div className="tool-form">
      <form onSubmit={create}>
        <label>
          {t("webAddress")}
          <input
            type="url"
            required
            value={url}
            maxLength={2000}
            onChange={(e) => {
              setUrl(e.target.value);
              setImage("");
            }}
            placeholder="https://"
          />
        </label>
        <button className="pill-button">{t("makeQr")}</button>
      </form>
      {error && (
        <p className="notice error" role="alert">
          {t("errors.invalidUrl")}
        </p>
      )}
      {image && (
        <div className="qr-result">
          <Image
            unoptimized
            src={image}
            width={240}
            height={240}
            alt={t("qrResult")}
          />
          <a className="outline-button" download="qr-code.png" href={image}>
            {t("downloadPng")}
          </a>
        </div>
      )}
      <p>{t("localOnly")}</p>
    </div>
  );
}
