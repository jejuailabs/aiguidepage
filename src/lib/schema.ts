import { z } from "zod";
import { mediaAssetSchema } from "./media.ts";
import { aiCategoryIdSchema } from "./ai-categories.ts";

export const hallKeys = ["ai", "prompts", "tools", "games"] as const;
export type HallKey = (typeof hallKeys)[number];
export const l10nSchema = z.object({
  ko: z.string().trim().min(1).max(10000),
  en: z.string().trim().max(10000).default(""),
});
const optionalL10n = l10nSchema.extend({
  ko: z.string().trim().max(10000).default(""),
});
const webUrl = z
  .string()
  .url()
  .max(2000)
  .refine((value) => value.startsWith("https://"), "HTTPS required");
export const hallSchema = z.object({
  key: z.enum(hallKeys),
  enabled: z.boolean(),
  order: z.number().int().min(0).max(100),
  title: l10nSchema,
});
export const orgSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9-]{2,39}$/),
  name: l10nSchema,
  logoUrl: z.union([webUrl, z.literal("")]).default(""),
  theme: z.object({
    palette: z.enum(["gallery", "ocean", "tangerine", "forest"]),
    mode: z.enum(["light", "dark", "system"]),
  }),
  defaultLocale: z.enum(["ko", "en"]),
  locales: z
    .array(z.enum(["ko", "en"]))
    .min(1)
    .max(2),
  firstAdminEmail: z.string().email().optional(),
});
const base = z.object({
  title: l10nSchema,
  summary: l10nSchema,
  category: z.string().max(40),
  order: z.number().int().min(0).max(100000),
  status: z.enum(["draft", "published", "archived"]),
  public: z.boolean().default(false),
});
export const contentSchema = z
  .discriminatedUnion("type", [
    base.extend({
      type: z.literal("ai"),
      data: z.object({
        url: webUrl,
        aiId: z.string().max(50).optional(),
        categories: z
          .array(aiCategoryIdSchema)
          .min(1)
          .max(30)
          .refine((values) => new Set(values).size === values.length)
          .optional(),
        description: optionalL10n,
        features: z.object({
          ko: z.array(z.string().max(500)).max(12),
          en: z.array(z.string().max(500)).max(12),
        }),
        prompt: optionalL10n,
      }),
    }),
    base.extend({
      type: z.literal("prompt"),
      data: z.object({
        aiSlug: z.enum([
          "claude",
          "chatgpt",
          "gemini",
          "grok",
          "perplexity",
          "genspark",
          "notebooklm",
          "flow",
          "suno",
          "flow-music",
        ]),
        text: l10nSchema,
        variables: z
          .array(
            z.object({
              key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,29}$/),
              label: l10nSchema,
            }),
          )
          .max(12)
          .default([]),
        resultText: l10nSchema.optional(),
        resultMedia: z.array(mediaAssetSchema).max(6).default([]),
        referenceImages: z
          .array(mediaAssetSchema.refine((asset) => asset.type === "image"))
          .max(3)
          .default([]),
      }),
    }),
    base.extend({
      type: z.literal("tool"),
      data: z.object({
        toolKey: z.enum([
          "prompt-builder",
          "char-count",
          "qr-maker",
          "template-fill",
        ]),
        template: l10nSchema.optional(),
      }),
    }),
    base.extend({
      type: z.literal("game"),
      data: z.object({
        gameKey: z.enum(["memory-match", "ai-quiz"]),
        questions: z
          .array(
            z.object({
              question: l10nSchema,
              options: z.array(l10nSchema).min(2).max(4),
              answer: z.number().int().min(0).max(3),
            }),
          )
          .max(30)
          .optional(),
      }),
    }),
  ])
  .superRefine((item, ctx) => {
    if (
      item.type === "ai" &&
      item.data.categories &&
      !item.data.categories.includes(item.category)
    )
      ctx.addIssue({
        code: "custom",
        path: ["category"],
        message: "Primary category must be selected",
      });
    if (item.type === "game" && item.data.gameKey === "ai-quiz") {
      if (!item.data.questions?.length)
        ctx.addIssue({
          code: "custom",
          path: ["data", "questions"],
          message: "Questions required",
        });
      item.data.questions?.forEach((question, index) => {
        if (question.answer >= question.options.length)
          ctx.addIssue({
            code: "custom",
            path: ["data", "questions", index, "answer"],
            message: "Answer must match an option",
          });
      });
    }
    if (
      item.type === "tool" &&
      item.data.toolKey === "template-fill" &&
      !item.data.template
    )
      ctx.addIssue({
        code: "custom",
        path: ["data", "template"],
        message: "Template required",
      });
  });
export type Content = z.infer<typeof contentSchema>;
export type PortalItem = Content & {
  id: string;
  scope: "common" | "org";
  orgId?: string;
  createdAt: number;
  updatedAt?: number;
};
export type Hall = z.infer<typeof hallSchema>;
export type Org = Omit<z.infer<typeof orgSchema>, "firstAdminEmail"> & {
  id: string;
  status: "active" | "suspended";
};
export type Viewer = {
  uid: string;
  email: string;
  name: string;
  platformAdmin: boolean;
};
export type Membership = {
  role: "admin" | "member";
  displayName: string;
  email: string;
};
export const inviteSchema = z.object({
  role: z.enum(["member", "admin"]),
  days: z.number().int().min(1).max(30),
  maxUses: z.number().int().min(1).max(100),
  email: z.union([z.string().email(), z.literal("")]).default(""),
});
export const prefsSchema = z.object({
  mode: z.enum(["light", "dark", "system"]),
  palette: z.enum(["gallery", "ocean", "tangerine", "forest"]),
  scale: z.enum(["100", "115", "130"]),
  locale: z.enum(["ko", "en"]),
});
export const hallType = {
  ai: "ai",
  prompts: "prompt",
  tools: "tool",
  games: "game",
} as const;
export function localize(value: { ko: string; en?: string }, locale: string) {
  return locale === "en" ? value.en || value.ko : value.ko;
}
