import "server-only";
import { MaisaError } from "./maisa-input.ts";
type Block =
  | { type: "text"; text: string }
  | {
      type: "image" | "document";
      source: { type: "base64"; media_type: string; data: string };
    };
export function assertAiConfigured(audio = false) {
  if (!process.env.CLAUDE_API_KEY || (audio && !process.env.OPENAI_API_KEY))
    throw new MaisaError("notConfigured", 503);
}
async function providerResponse(response: Response) {
  if (response.ok) return;
  // Never return provider messages: they may include account or billing details.
  throw new MaisaError(
    response.status === 429
      ? "providerBusy"
      : response.status === 401 || response.status === 403
        ? "notConfigured"
        : "processingFailed",
    response.status === 429 ? 429 : 502,
  );
}
export async function askMaisaJson(
  system: string,
  prompt: string,
  attachments: Block[] = [],
  maxTokens = 5000,
): Promise<Record<string, unknown>> {
  assertAiConfigured();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.CLAUDE_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [
        {
          role: "user",
          content: [...attachments, { type: "text", text: prompt }],
        },
      ],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(110000),
  });
  await providerResponse(response);
  const payload = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text =
    payload.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text || "")
      .join("\n") || "";
  const candidate =
    text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ||
    text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error();
    return parsed;
  } catch {
    throw new MaisaError("invalidResult", 502);
  }
}
export async function fileToBlock(file: File): Promise<Block> {
  const bytes = Buffer.from(await file.arrayBuffer());
  if (file.type === "text/plain")
    return { type: "text", text: bytes.toString("utf8").slice(0, 50000) };
  // Validate signatures as well as the browser-supplied MIME.
  const valid =
    file.type === "application/pdf"
      ? bytes.subarray(0, 5).toString() === "%PDF-"
      : file.type === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : file.type === "image/png"
          ? bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : file.type === "image/webp"
            ? bytes.subarray(0, 4).toString() === "RIFF" &&
              bytes.subarray(8, 12).toString() === "WEBP"
            : false;
  if (!valid) throw new MaisaError("invalidFile");
  return {
    type: file.type === "application/pdf" ? "document" : "image",
    source: {
      type: "base64",
      media_type: file.type,
      data: bytes.toString("base64"),
    },
  };
}
export async function transcribeMaisa(file: File) {
  assertAiConfigured(true);
  const body = new FormData();
  body.set("file", file, file.name);
  body.set("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe");
  body.set("language", "ko");
  body.set("response_format", "json");
  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(110000),
    },
  );
  await providerResponse(response);
  const payload = (await response.json()) as { text?: string };
  if (!payload.text) throw new MaisaError("invalidResult", 502);
  return payload.text.slice(0, 50000);
}
export async function speakMaisa(text: string, style: string) {
  assertAiConfigured(true);
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: process.env.OPENAI_TTS_VOICE || "coral",
      input: text.slice(0, 3500),
      instructions: `자연스러운 한국어 안내입니다. ${style} 분위기로 또렷하고 천천히 읽어주세요.`,
      response_format: "mp3",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(110000),
  });
  await providerResponse(response);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 2.8 * 1024 * 1024)
    throw new MaisaError("audioTooLarge", 502);
  return bytes.toString("base64");
}
