import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { assertMutation, jsonBody, failure, result } from "@/lib/server/http";
import { getViewer, sessionName, sessionSeconds, sessionSecure } from "@/lib/server/session";
import { ensureProfile } from "@/lib/server/portal";
import { PortalError } from "@/lib/server/errors";
export const runtime = "nodejs";

export async function GET() {
  return result({ viewer: await getViewer() });
}
export async function POST(request: NextRequest) {
  try {
    assertMutation(request);
    const { idToken } = z
      .object({ idToken: z.string().min(20).max(10000) })
      .parse(await jsonBody(request));
    const auth = getFirebaseAdminAuth();
    const claims = await auth.verifyIdToken(idToken, true).catch(() => {
      throw new PortalError("unauthorized", 401);
    });
    if (!claims.email_verified || !claims.email)
      throw new PortalError("verifyEmail", 403);
    if (Date.now() / 1000 - claims.auth_time > 300)
      throw new PortalError("recentLogin", 401);
    if (
      process.env.PLATFORM_ADMIN_EMAIL &&
      claims.email.toLowerCase() ===
        process.env.PLATFORM_ADMIN_EMAIL.toLowerCase() &&
      !claims.platformAdmin
    ) {
      const user = await auth.getUser(claims.uid);
      await auth.setCustomUserClaims(claims.uid, {
        ...user.customClaims,
        platformAdmin: true,
      });
      return result({ refreshToken: true });
    }
    const viewer = {
      uid: claims.uid,
      email: claims.email,
      name: claims.name || claims.email.split("@")[0],
      platformAdmin: claims.platformAdmin === true,
    };
    await ensureProfile(viewer);
    const session = await auth.createSessionCookie(idToken, {
      expiresIn: sessionSeconds * 1000,
    });
    const response = result({ viewer });
    response.cookies.set(sessionName, session, {
      httpOnly: true,
      secure: sessionSecure,
      sameSite: "lax",
      path: "/",
      maxAge: sessionSeconds,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: NextRequest) {
  try {
    assertMutation(request);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionName, "", {
      httpOnly: true,
      secure: sessionSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
