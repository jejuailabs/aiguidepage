import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getFirebaseAdminAuth } from "../firebase/admin.ts";
import type { Viewer } from "../schema.ts";
import { PortalError } from "./errors.ts";

export const sessionName = process.env.SESSION_COOKIE_NAME || "aiguide-session";
export const sessionSeconds = 60 * 60 * 24 * 14;
export const sessionSecure=process.env.NODE_ENV==='production'&&!(process.env.GCLOUD_PROJECT?.startsWith('demo-')&&process.env.FIREBASE_AUTH_EMULATOR_HOST&&process.env.FIRESTORE_EMULATOR_HOST);
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const token = (await cookies()).get(sessionName)?.value;
  if (!token) return null;
  try {
    const claims = await getFirebaseAdminAuth().verifySessionCookie(
      token,
      true,
    );
    if (!claims.email_verified || !claims.email) return null;
    return {
      uid: claims.uid,
      email: claims.email,
      name: claims.name || claims.email.split("@")[0],
      platformAdmin: claims.platformAdmin === true,
    };
  } catch {
    return null;
  }
});
export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) throw new PortalError("unauthorized", 401);
  return viewer;
}
