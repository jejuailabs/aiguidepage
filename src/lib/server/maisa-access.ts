import "server-only";
import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "../firebase/admin.ts";
import { contentSchema, type Viewer } from "../schema.ts";
import { MaisaError, type AiInput } from "./maisa-input.ts";
import { getHalls, orgRef, requireOrg } from "./portal.ts";

export async function authorizeMaisaTool(
  viewer: Viewer,
  input: AiInput,
  toolKey: string,
) {
  const db = getFirebaseAdminFirestore();
  if (input.orgId) {
    await requireOrg(viewer, input.orgId);
    const halls = await getHalls(viewer, input.orgId);
    if (!halls.some((hall) => hall.key === "tools" && hall.enabled))
      throw new MaisaError("forbidden", 403);
  }
  const ref =
    input.scope === "org"
      ? orgRef(input.orgId!).collection("items").doc(input.itemId)
      : db.collection("items").doc(input.itemId);
  const snap = await ref.get();
  const parsed = contentSchema.safeParse(snap.data());
  if (
    !parsed.success ||
    parsed.data.type !== "tool" ||
    parsed.data.data.toolKey !== toolKey ||
    parsed.data.status !== "published" ||
    (input.scope === "common" && !input.orgId && !parsed.data.public)
  )
    throw new MaisaError("forbidden", 403);
  if (input.orgId && input.scope === "common") {
    const override = await orgRef(input.orgId)
      .collection("overrides")
      .doc(input.itemId)
      .get();
    if (override.data()?.hidden) throw new MaisaError("forbidden", 403);
  }
}
const limit = (value: string | undefined, fallback: number, max: number) =>
  Math.max(1, Math.min(max, Number(value) || fallback));
export async function reserveMaisaRun(uid: string) {
  const db = getFirebaseAdminFirestore();
  const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const user = db
      .collection("aiUsage")
      .doc(`${day}-${createHash("sha256").update(uid).digest("hex")}`),
    global = db.collection("aiUsage").doc(`${day}-total`);
  const userLimit = limit(process.env.AI_USER_DAILY_LIMIT, 10, 100),
    totalLimit = limit(process.env.AI_DAILY_LIMIT, 100, 2000);
  await db.runTransaction(async (tx) => {
    const [personal, total] = await Promise.all([tx.get(user), tx.get(global)]);
    const now = Date.now();
    if ((personal.data()?.lockedUntil?.toMillis?.() || 0) > now)
      throw new MaisaError("alreadyRunning", 429);
    if (
      (personal.data()?.count || 0) >= userLimit ||
      (total.data()?.count || 0) >= totalLimit
    )
      throw new MaisaError("dailyLimit", 429);
    tx.set(
      user,
      {
        count: FieldValue.increment(1),
        lockedUntil: Timestamp.fromMillis(now + 300000),
        expiresAt: Timestamp.fromMillis(now + 2 * 86400000),
      },
      { merge: true },
    );
    tx.set(
      global,
      {
        count: FieldValue.increment(1),
        expiresAt: Timestamp.fromMillis(now + 2 * 86400000),
      },
      { merge: true },
    );
  });
  return async () => {
    await user.update({ lockedUntil: Timestamp.fromMillis(0) });
  };
}
