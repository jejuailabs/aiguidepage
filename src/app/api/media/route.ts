import { NextRequest } from "next/server";
import { z } from "zod";
import { requireViewer } from "@/lib/server/session";
import { assertMutation, failure, jsonBody, result } from "@/lib/server/http";
import { prepareUpload, finishUpload, discardUpload } from "@/lib/server/media";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    assertMutation(request);
    const viewer = await requireViewer(),
      body = await jsonBody(request);
    const action = z
      .object({ action: z.enum(["prepare", "finish", "discard"]) })
      .parse(body).action;
    if (action === "prepare") return result(await prepareUpload(viewer, body));
    const id = z.object({ id: z.string().uuid() }).parse(body).id;
    if (action === "finish")
      return result({ asset: await finishUpload(viewer, id) });
    await discardUpload(viewer, id);
    return result({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
