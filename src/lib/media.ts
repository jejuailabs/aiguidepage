import { z } from "zod";

export const imageLimit = 8 * 1024 * 1024;
export const videoLimit = 50 * 1024 * 1024;
export const imageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const mediaTypes = [...imageTypes, "video/mp4", "video/webm"] as const;
export const mediaAssetSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(["image", "video"]),
    name: z.string().min(1).max(160),
    url: z
      .string()
      .url()
      .max(2000)
      .refine((value) => value.startsWith("https://")),
    mime: z.enum(mediaTypes),
    size: z.number().int().positive().max(videoLimit),
  })
  .refine(
    (asset) =>
      asset.type === (asset.mime.startsWith("image/") ? "image" : "video") &&
      (asset.type !== "image" || asset.size <= imageLimit),
  );
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export const uploadRequestSchema = z
  .object({
    orgId: z
      .string()
      .regex(/^[a-z][a-z0-9-]{2,39}$/)
      .nullable(),
    purpose: z.enum(["result", "reference"]),
    name: z.string().trim().min(1).max(160),
    mime: z.enum(mediaTypes),
    size: z.number().int().positive().max(videoLimit),
  })
  .refine(
    (value) =>
      (!value.mime.startsWith("image/") || value.size <= imageLimit) &&
      (value.purpose !== "reference" || value.mime.startsWith("image/")),
  );

export function matchesMediaSignature(bytes: Uint8Array, mime: string) {
  const text = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  if (mime === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png")
    return [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => bytes[index] === value,
    );
  if (mime === "image/webp")
    return text(0, 4) === "RIFF" && text(8, 12) === "WEBP";
  if (mime === "video/mp4") return text(4, 8) === "ftyp";
  if (mime === "video/webm")
    return [26, 69, 223, 163].every((value, index) => bytes[index] === value);
  return false;
}
