"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Upload } from "lucide-react";
import { api, ApiError } from "@/lib/client-api";
import { uploadRequestSchema, type MediaAsset } from "@/lib/media";
import { MediaPreview } from "./media-gallery";

export function MediaUploader({
  value,
  onChange,
  purpose,
  orgId,
  onBusyChange,
}: {
  value: MediaAsset[];
  onChange: (assets: MediaAsset[]) => void;
  purpose: "result" | "reference";
  orgId: string | null;
  onBusyChange: (busy: boolean) => void;
}) {
  const t = useTranslations("portal"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(0);
  const uploaded = useRef(new Set<string>()),
    active = useRef(true),
    current = useRef<XMLHttpRequest | null>(null);
  const limit = purpose === "reference" ? 3 : 6;
  useEffect(() => {
    active.current = true;
    const ids = uploaded.current;
    return () => {
      active.current = false;
      current.current?.abort();
      for (const id of ids)
        void api("/api/media", { action: "discard", id }).catch(() => {});
    };
  }, []);
  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    if (value.length + files.length > limit) {
      setError("tooManyMedia");
      return;
    }
    const inputs = Array.from(files).map((file) => ({
      file,
      input: {
        orgId,
        purpose,
        name: file.name,
        mime: file.type,
        size: file.size,
      },
    }));
    if (
      inputs.some(({ input }) => !uploadRequestSchema.safeParse(input).success)
    ) {
      setError("invalidFile");
      return;
    }
    setBusy(true);
    onBusyChange(true);
    let next = [...value];
    try {
      for (const { file, input } of inputs) {
        setProgress(0);
        const ticket = await api<{
          id: string;
          url: string;
          fields: Record<string, string>;
        }>("/api/media", { action: "prepare", ...input });
        uploaded.current.add(ticket.id);
        if (!active.current) {
          await api("/api/media", { action: "discard", id: ticket.id });
          return;
        }
        const form = new FormData();
        for (const [key, data] of Object.entries(ticket.fields))
          form.append(key, data);
        form.append("file", file);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          current.current = xhr;
          xhr.open("POST", ticket.url);
          xhr.timeout = 300000;
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && active.current)
              setProgress(Math.round((event.loaded / event.total) * 100));
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(new ApiError("uploadFailed"));
          xhr.onerror = xhr.ontimeout = () =>
            reject(new ApiError("uploadFailed"));
          xhr.onabort = () => reject(new ApiError("uploadCancelled"));
          xhr.send(form);
        });
        const { asset } = await api<{ asset: MediaAsset }>("/api/media", {
          action: "finish",
          id: ticket.id,
        });
        next = [...next, asset];
        if (active.current) onChange(next);
      }
    } catch (error) {
      if (active.current)
        setError(error instanceof ApiError ? error.code : "uploadFailed");
    } finally {
      if (active.current) {
        setBusy(false);
        onBusyChange(false);
      }
    }
  }
  return (
    <fieldset className="media-uploader">
      <legend>
        {t(purpose === "reference" ? "referenceImages" : "resultGallery")}
      </legend>
      <p>
        {t(
          purpose === "reference" ? "referenceUploadHint" : "resultUploadHint",
        )}
      </p>
      {!!value.length && (
        <div className="upload-previews">
          {value.map((asset) => (
            <div key={asset.id}>
              <MediaPreview asset={asset} alt={asset.name} />
              <span>{asset.name}</span>
              <button
                type="button"
                className="icon-button"
                aria-label={t("removeMedia", { name: asset.name })}
                disabled={busy}
                onClick={() => {
                  onChange(value.filter((value) => value.id !== asset.id));
                  if (uploaded.current.delete(asset.id))
                    void api("/api/media", {
                      action: "discard",
                      id: asset.id,
                    }).catch(() => {});
                }}
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="upload-input">
        <Upload size={18} />
        {t(purpose === "reference" ? "addReferenceImages" : "addResultMedia")}
        <input
          type="file"
          multiple
          disabled={busy || value.length >= limit}
          accept={
            purpose === "reference"
              ? "image/jpeg,image/png,image/webp"
              : "image/jpeg,image/png,image/webp,video/mp4,video/webm"
          }
          onChange={(event) => {
            void add(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      <p className="field-hint">
        {t("mediaCount", { count: value.length, limit })}
      </p>
      {busy && (
        <div role="status">
          {t("uploading", { progress })}
          <progress value={progress} max={100} />
        </div>
      )}
      {error && (
        <p role="alert" className="notice error">
          {t(`errors.${error}`, { limit })}
        </p>
      )}
    </fieldset>
  );
}
