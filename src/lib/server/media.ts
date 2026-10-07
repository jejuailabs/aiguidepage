import "server-only";
import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  getFirebaseAdminApp,
  getFirebaseAdminFirestore,
} from "../firebase/admin.ts";
import {
  uploadRequestSchema,
  matchesMediaSignature,
  type MediaAsset,
} from "../media.ts";
import type { Viewer } from "../schema.ts";
import { requireOrg } from "./portal.ts";
import { PortalError } from "./errors.ts";

const db = () => getFirebaseAdminFirestore();
function bucket() {
  if (process.env.FIRESTORE_EMULATOR_HOST)
    throw new PortalError("storageNotReady", 503);
  const name =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!name) throw new PortalError("storageNotReady", 503);
  return getStorage(getFirebaseAdminApp()).bucket(name);
}
async function authorize(viewer: Viewer, orgId: string | null) {
  if (orgId) await requireOrg(viewer, orgId, true);
  else if (!viewer.platformAdmin) throw new PortalError("forbidden", 403);
}
export async function prepareUpload(viewer: Viewer, input: unknown) {
  const value = uploadRequestSchema.parse(input);
  await authorize(viewer, value.orgId);
  const id = randomUUID(),
    extension = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "video/mp4": "mp4",
      "video/webm": "webm",
    }[value.mime],
    path = `prompt-media/${value.orgId || "common"}/${id}.${extension}`,
    expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
  const file = bucket().file(path);
  const [policy] = await file.generateSignedPostPolicyV4({
    expires: expiresAt.toMillis(),
    conditions: [["content-length-range", 1, value.size]],
    fields: { "Content-Type": value.mime, success_action_status: "201" },
  });
  await db()
    .collection("mediaUploads")
    .doc(id)
    .create({
      ...value,
      name: `${value.name
        .replace(/[\\/\r\n]/g, "_")
        .replace(/\.[^.]+$/, "")
        .slice(0, 150)}.${extension}`,
      uid: viewer.uid,
      path,
      state: "pending",
      attachments: [],
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
    });
  return { id, ...policy };
}
export async function finishUpload(viewer: Viewer, id: string) {
  const ref = db().collection("mediaUploads").doc(id),
    snap = await ref.get(),
    value = snap.data();
  if (!value || value.uid !== viewer.uid)
    throw new PortalError("forbidden", 403);
  await authorize(viewer, value.orgId);
  if (value.state === "ready") return value.asset as MediaAsset;
  if (value.state !== "pending" || value.expiresAt.toMillis() < Date.now())
    throw new PortalError("uploadExpired");
  const storage = bucket(),
    file = storage.file(value.path),
    [metadata] = await file.getMetadata();
  const [head] = await file.download({ start: 0, end: 31 });
  if (
    Number(metadata.size) !== value.size ||
    metadata.contentType !== value.mime ||
    !matchesMediaSignature(head, value.mime)
  ) {
    await file.delete({ ignoreNotFound: true });
    await ref.delete();
    throw new PortalError("invalidFile");
  }
  const token = randomUUID();
  await file.setMetadata({
    cacheControl: "public,max-age=86400",
    metadata: { firebaseStorageDownloadTokens: token },
  });
  const asset: MediaAsset = {
    id,
    type: value.mime.startsWith("image/") ? "image" : "video",
    name: value.name,
    mime: value.mime,
    size: value.size,
    url: `https://firebasestorage.googleapis.com/v0/b/${storage.name}/o/${encodeURIComponent(value.path)}?alt=media&token=${token}`,
  };
  await ref.update({ state: "ready", asset });
  return asset;
}
export async function discardUpload(viewer: Viewer, id: string) {
  const ref = db().collection("mediaUploads").doc(id);
  const path = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref),
      value = snap.data();
    if (!value) return null;
    if (value.uid !== viewer.uid) throw new PortalError("forbidden", 403);
    if (value.attachments?.length) return null;
    tx.update(ref, { state: "deleting" });
    return value.path as string;
  });
  if (path) {
    await bucket().file(path).delete({ ignoreNotFound: true });
    await ref.delete();
  }
}
