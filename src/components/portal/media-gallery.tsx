"use client";
import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, ImageIcon, Play } from "lucide-react";
import type { MediaAsset } from "@/lib/media";
import { downloadMedia } from "@/lib/client-media";

export function MediaPreview({
  asset,
  alt,
}: {
  asset?: MediaAsset;
  alt: string;
}) {
  const t = useTranslations("portal");
  return (
    <div className="media-preview">
      {asset?.type === "image" ? (
        <Image
          src={asset.url}
          alt={alt}
          width={1200}
          height={900}
          unoptimized
        />
      ) : asset ? (
        <>
          <video
            src={asset.url}
            preload="metadata"
            muted
            playsInline
            aria-label={alt}
          />
          <span className="video-label">
            <Play size={18} />
            {t("videoResult")}
          </span>
        </>
      ) : (
        <div className="media-placeholder">
          <ImageIcon size={32} />
          <span>{t("noResultMedia")}</span>
        </div>
      )}
    </div>
  );
}
export function MediaGallery({ assets }: { assets: MediaAsset[] }) {
  const t = useTranslations("portal"),
    [selected, setSelected] = useState(0);
  const asset = assets[Math.min(selected, assets.length - 1)];
  if (!asset) return null;
  return (
    <section className="result-gallery" aria-label={t("resultGallery")}>
      <h3>{t("resultGallery")}</h3>
      <div className="result-viewer">
        {asset.type === "video" ? (
          <video
            key={asset.id}
            src={asset.url}
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <Image
            src={asset.url}
            alt={asset.name}
            width={1200}
            height={900}
            unoptimized
          />
        )}
      </div>
      {assets.length > 1 && (
        <div className="media-thumbnails">
          {assets.map((value, index) => (
            <button
              key={value.id}
              aria-label={t("showResult", { number: index + 1 })}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              <MediaPreview asset={value} alt={value.name} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
export function ReferenceImages({ assets }: { assets: MediaAsset[] }) {
  const t = useTranslations("portal"),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(false);
  if (!assets.length) return null;
  return (
    <section className="reference-section">
      <h3>{t("referenceImages")}</h3>
      <p>{t("referenceHint")}</p>
      <div className="reference-grid">
        {assets.map((asset, index) => (
          <article key={asset.id}>
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("viewReference", { number: index + 1 })}
            >
              <MediaPreview
                asset={asset}
                alt={t("referenceNumber", { number: index + 1 })}
              />
            </a>
            <button
              className="outline-button"
              disabled={!!busy}
              onClick={async () => {
                setBusy(asset.id);
                setError(false);
                try {
                  await downloadMedia(asset);
                } catch {
                  setError(true);
                } finally {
                  setBusy("");
                }
              }}
            >
              <Download size={16} />
              {t(busy === asset.id ? "working" : "saveReference", {
                number: index + 1,
              })}
            </button>
          </article>
        ))}
      </div>
      {error && (
        <p role="alert" className="notice error">
          {t("errors.downloadFailed")}
        </p>
      )}
    </section>
  );
}
