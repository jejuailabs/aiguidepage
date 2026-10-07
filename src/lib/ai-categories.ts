import { z } from "zod";
import { aiItems } from "../data/ai.ts";
export const aiCategoryIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{0,39}$/)
  .refine((id) => id !== "all");
export const aiCategorySchema = z.object({
  id: aiCategoryIdSchema,
  title: z.object({
    ko: z.string().trim().min(1).max(80),
    en: z.string().trim().max(80).default(""),
  }),
  enabled: z.boolean(),
});
export const aiCategorySettingsSchema = z.object({
  revision: z.number().int().min(0),
  categories: z
    .array(aiCategorySchema)
    .min(1)
    .max(30)
    .refine(
      (values) =>
        new Set(values.map((value) => value.id)).size === values.length,
    ),
});
export type AiCategory = z.infer<typeof aiCategorySchema>;
export type AiCategorySettings = z.infer<typeof aiCategorySettingsSchema>;
export const defaultAiCategories: AiCategory[] = [
  { id: "chat", title: { ko: "대화", en: "Chat" }, enabled: true },
  { id: "search", title: { ko: "검색", en: "Search" }, enabled: true },
  { id: "documents", title: { ko: "문서", en: "Documents" }, enabled: true },
  { id: "image", title: { ko: "이미지", en: "Images" }, enabled: true },
  { id: "video", title: { ko: "영상", en: "Video" }, enabled: true },
  { id: "music", title: { ko: "음악", en: "Music" }, enabled: true },
];
// A saved selection is authoritative, including removal of a built-in tag.
export function aiCategoryIds(item: {
  category: string;
  data: { aiId?: string; categories?: string[] };
}): string[] {
  if (item.data.categories) return item.data.categories;
  const base = aiItems.find((ai) => ai.id === item.data.aiId);
  return Array.from(new Set([item.category, ...(base?.categories || [])]));
}
