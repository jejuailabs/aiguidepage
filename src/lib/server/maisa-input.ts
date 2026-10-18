import { z } from "zod";
import { maisaTools, type MaisaSlug } from "../maisa-tools.ts";

export class MaisaError extends Error {
  code: string;
  status: number;
  constructor(code: string, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
const MB = 1024 * 1024;
export const MAX_AI_FILE_BYTES = 4 * MB;
export const aiInputSchema = z.object({
  consent: z.literal(true),
  locale: z.enum(["ko", "en"]).default("ko"),
  itemId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  scope: z.enum(["common", "org"]),
  orgId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{1,100}$/)
    .optional(),
  text: z.string().trim().max(12000).default(""),
  template: z
    .enum(["notice", "application", "report", "minutes", "plan"])
    .default("notice"),
  style: z.enum(["formal", "friendly", "cheerful"]).default("formal"),
  answers: z.array(z.string().trim().max(2000)).length(8).optional(),
  basics: z
    .object({
      group: z.string().trim().max(100).default(""),
      title: z.string().trim().max(100).default(""),
      grant: z
        .string()
        .regex(/^\d{0,10}$/)
        .default(""),
      contribution: z
        .string()
        .regex(/^\d{0,10}$/)
        .default(""),
    })
    .optional(),
});
export type AiInput = z.infer<typeof aiInputSchema>;
export function getMaisaDefinition(slug: string) {
  const definition = maisaTools.find((tool) => tool.slug === slug);
  if (!definition) throw new MaisaError("unknownTool", 404);
  return definition;
}
export async function parseAiInput(request: Request, slug: MaisaSlug) {
  // Bound the actual body, including requests without Content-Length.
  if (Number(request.headers.get("content-length") || 0) > 4.2 * MB)
    throw new MaisaError("fileTooLarge", 413);
  const chunks: Uint8Array[] = [];
  const reader = request.body?.getReader();
  let size = 0;
  if (!reader) throw new MaisaError("invalid");
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4.2 * MB) {
        await reader.cancel();
        throw new MaisaError("fileTooLarge", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = Buffer.concat(chunks);
  const contentType = request.headers.get("content-type") || "";
  let raw: unknown;
  let files: File[] = [];
  try {
    if (contentType.startsWith("multipart/form-data")) {
      const form = await new Response(body, {
        headers: { "content-type": contentType },
      }).formData();
      raw = JSON.parse(String(form.get("input") || ""));
      const entries = form.getAll("files");
      if (entries.some((value) => !(value instanceof File)))
        throw new MaisaError("invalidFile");
      files = entries as File[];
    } else if (contentType.startsWith("application/json"))
      raw = JSON.parse(body.toString("utf8"));
    else throw new MaisaError("invalid");
  } catch (error) {
    if (error instanceof MaisaError) throw error;
    throw new MaisaError("invalid");
  }
  const input = aiInputSchema.parse(raw);
  if (input.scope === "org" && !input.orgId) throw new MaisaError("invalid");
  if (["format", "narration"].includes(slug) && !input.text)
    throw new MaisaError("textRequired");
  if (slug === "narration" && input.text.length > 3500)
    throw new MaisaError("textTooLong");
  if (
    slug === "business-plan" &&
    !input.answers?.some((answer) => answer.trim())
  )
    throw new MaisaError("textRequired");
  const definition = getMaisaDefinition(slug);
  if (definition.kind === "file") {
    if (!files.length || files.length > (slug === "receipt" ? 3 : 1))
      throw new MaisaError("fileCount");
    if (
      files.some((file) => !file.size) ||
      files.reduce((sum, file) => sum + file.size, 0) > MAX_AI_FILE_BYTES
    )
      throw new MaisaError("fileTooLarge", 413);
    const allowed = definition.accept.split(",");
    if (files.some((file) => !allowed.includes(file.type)))
      throw new MaisaError("invalidFile");
    if (files.some((file) => file.name.length > 240))
      throw new MaisaError("invalidFile");
  } else if (files.length) throw new MaisaError("invalidFile");
  return { input, files };
}
