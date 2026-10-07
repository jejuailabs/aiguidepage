import { readFile } from "node:fs/promises";
import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin.ts";
import { catalog } from "../src/data/catalog.ts";
import { contentSchema } from "../src/lib/schema.ts";
import { FieldValue } from "firebase-admin/firestore";
const messages = await Promise.all(
  ["ko", "en"].map(async (language) =>
    JSON.parse(
      await readFile(
        new URL(`../messages/${language}.json`, import.meta.url),
        "utf8",
      ),
    ),
  ),
);
const defaults = catalog({ ko: messages[0].ai, en: messages[1].ai }).filter(
  ({ item }) => item.type !== "ai",
);
const db = getFirebaseAdminFirestore(),
  apply = process.argv.includes("--apply");
const canonical = (value) =>
  JSON.stringify(value, (_, entry) =>
    entry && typeof entry === "object" && !Array.isArray(entry)
      ? Object.fromEntries(
          Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)),
        )
      : entry,
  );
const result = { apply, updated: [], alreadyPublic: [], preserved: [] };
for (const { id, item } of defaults) {
  await db.runTransaction(async (tx) => {
    const ref = db.collection("items").doc(id),
      snapshot = await tx.get(ref),
      stored = snapshot.data();
    if (!stored) {
      result.preserved.push(id);
      return;
    }
    const current = contentSchema.parse(stored);
    if (current.public) {
      result.alreadyPublic.push(id);
      return;
    }
    const { public: oldPublic, ...oldContent } = current,
      { public: newPublic, ...newContent } = contentSchema.parse(item);
    void oldPublic;
    void newPublic;
    if (stored.updatedBy || canonical(oldContent) !== canonical(newContent)) {
      result.preserved.push(id);
      return;
    }
    if (apply)
      tx.update(ref, { public: true, updatedAt: FieldValue.serverTimestamp() });
    result.updated.push(id);
  });
}
console.log(JSON.stringify(result));
