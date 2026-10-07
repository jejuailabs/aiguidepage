import { NextRequest } from "next/server";
import { z } from "zod";
import { requireViewer } from "@/lib/server/session";
import { assertMutation, failure, jsonBody, result } from "@/lib/server/http";
import { PortalError } from "@/lib/server/errors";
import * as portal from "@/lib/server/portal";
import { hallKeys, type HallKey } from "@/lib/schema";
export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: NextRequest, context: Context) {
  try {
    if (request.method !== "GET") assertMutation(request);
    const viewer = await requireViewer();
    const { path } = await context.params;
    const key = path.join("/"),
      method = request.method;
    const body =
      method === "GET" || method === "DELETE" ? {} : await jsonBody(request);
    if (key === "me" && method === "GET")
      return result(await portal.listMyOrgs(viewer));
    if (key === "me/prefs" && method === "POST") {
      await portal.savePreferences(viewer, body);
      return result({ ok: true });
    }
    if (key === "me/favorites" && method === "GET")
      return result({ favorites: await portal.favorites(viewer) });
    if (key === "join" && method === "POST")
      return result(
        await portal.joinOrg(
          viewer,
          z.object({ code: z.string().max(30) }).parse(body).code,
        ),
      );
    if (key === "platform" && method === "GET")
      return result(await portal.platformOverview(viewer));
    if (key === "platform/orgs" && method === "POST")
      return result(await portal.createOrg(viewer, body));
    if (path[0] === "platform" && path[1] === "items" && method === "POST")
      return result(await portal.saveItem(viewer, null, body, path[2]));
    if (path[0] === "orgs" && path[1]) {
      const id = path[1],
        action = path[2];
      if (action === "select" && method === "POST") {
        await portal.selectOrg(viewer, id);
        return result({ ok: true });
      }
      if (action === "halls" && method === "GET")
        return result({ halls: await portal.getHalls(viewer, id) });
      if (action === "halls" && method === "POST") {
        await portal.saveHall(viewer, id, body);
        return result({ ok: true });
      }
      if (action === "items" && method === "GET") {
        const hall = z
          .enum(hallKeys)
          .parse(request.nextUrl.searchParams.get("hall")) as HallKey;
        return result(
          await portal.hallItems(
            viewer,
            id,
            hall,
            request.nextUrl.searchParams.get("cursor") || undefined,
          ),
        );
      }
      if (action === "items" && method === "POST")
        return result(await portal.saveItem(viewer, id, body, path[3]));
      if (action === "search" && method === "GET")
        return result({
          groups: await portal.searchItems(
            viewer,
            id,
            request.nextUrl.searchParams.get("q") || "",
          ),
        });
      if (action === "admin" && method === "GET")
        return result(await portal.adminOverview(viewer, id));
      if (action === "branding" && method === "POST") {
        await portal.saveOrg(viewer, id, body);
        return result({ ok: true });
      }
      if (action === "invites" && method === "POST")
        return result(await portal.createInvite(viewer, id, body));
      if (action === "invites" && path[3] && method === "DELETE") {
        await portal.revokeInvite(viewer, id, path[3]);
        return result({ ok: true });
      }
      if (action === "members" && path[3] && method === "POST") {
        await portal.updateMember(
          viewer,
          id,
          path[3],
          z.object({ role: z.enum(["member", "admin", "remove"]) }).parse(body)
            .role,
        );
        return result({ ok: true });
      }
      if (action === "overrides" && path[3] && method === "POST") {
        await portal.saveOverride(
          viewer,
          id,
          path[3],
          z
            .object({
              hidden: z.boolean(),
              order: z.number().int().min(0).max(100000).optional(),
            })
            .parse(body),
        );
        return result({ ok: true });
      }
      if (action === "favorites" && method === "POST") {
        const value = z
          .object({
            scope: z.enum(["common", "org"]),
            itemId: z.string().max(100),
            enabled: z.boolean(),
          })
          .parse(body);
        await portal.favorite(
          viewer,
          id,
          value.scope,
          value.itemId,
          value.enabled,
        );
        return result({ ok: true });
      }
    }
    throw new PortalError("notFound", 404);
  } catch (error) {
    return failure(error);
  }
}
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
