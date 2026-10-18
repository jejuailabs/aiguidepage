import { ZodError } from "zod";
import { requireViewer } from "@/lib/server/session";
import { verifyOrigin } from "@/lib/server/csrf";
import { PortalError } from "@/lib/server/errors";
import {
  MaisaError,
  getMaisaDefinition,
  parseAiInput,
} from "@/lib/server/maisa-input";
import { assertAiConfigured } from "@/lib/server/maisa-providers";
import { authorizeMaisaTool, reserveMaisaRun } from "@/lib/server/maisa-access";
import { runMaisa } from "@/lib/server/maisa-run";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tool: string }> },
) {
  let release: (() => Promise<void>) | undefined;
  try {
    verifyOrigin(request);
    const viewer = await requireViewer();
    const definition = getMaisaDefinition((await params).tool);
    const { input, files } = await parseAiInput(request, definition.slug);
    await authorizeMaisaTool(viewer, input, definition.key);
    assertAiConfigured(["transcribe", "narration"].includes(definition.slug));
    release = await reserveMaisaRun(viewer.uid);
    const result = await runMaisa(definition.slug, input, files);
    return Response.json(
      { result },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const known = error instanceof MaisaError || error instanceof PortalError;
    const code = known
      ? error.code
      : error instanceof ZodError
        ? "invalid"
        : "processingFailed";
    const status = known ? error.status : error instanceof ZodError ? 400 : 502;
    return Response.json(
      { error: code },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  } finally {
    if (release) await release().catch(() => {});
  }
}
