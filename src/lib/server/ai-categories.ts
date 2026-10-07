import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "../firebase/admin.ts";
import {
  aiCategorySettingsSchema,
  defaultAiCategories,
} from "../ai-categories.ts";
import type { Viewer } from "../schema.ts";
import { PortalError } from "./errors.ts";
const ref = () => getFirebaseAdminFirestore().doc("settings/aiCategories");
export async function getAiCategorySettings() {
  const doc = await ref().get();
  return doc.exists
    ? aiCategorySettingsSchema.parse(doc.data())
    : { revision: 0, categories: defaultAiCategories };
}
export async function saveAiCategorySettings(viewer: Viewer, input: unknown) {
  if (!viewer.platformAdmin) throw new PortalError("forbidden", 403);
  const value = aiCategorySettingsSchema.parse(input);
  await getFirebaseAdminFirestore().runTransaction(async (tx) => {
    const doc = await tx.get(ref()),
      current = doc.exists
        ? aiCategorySettingsSchema.parse(doc.data())
        : { revision: 0, categories: defaultAiCategories };
    if (current.revision !== value.revision)
      throw new PortalError("changedReload", 409);
    // Hide instead of removing IDs so existing AI assignments remain valid.
    if (
      current.categories.some(
        (category) => !value.categories.some((next) => next.id === category.id),
      )
    )
      throw new PortalError("invalid");
    tx.set(ref(), {
      ...value,
      revision: value.revision + 1,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: viewer.uid,
    });
  });
  return getAiCategorySettings();
}
