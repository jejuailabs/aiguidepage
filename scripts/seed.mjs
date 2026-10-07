import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin.ts";
import { catalog, hallTemplates } from "../src/data/catalog.ts";
import { contentSchema, hallSchema } from "../src/lib/schema.ts";
export async function seed(db = getFirebaseAdminFirestore()) {
  const [ko, en] = await Promise.all(
    ["ko", "en"].map(async (locale) =>
      JSON.parse(
        await readFile(
          new URL(`../messages/${locale}.json`, import.meta.url),
          "utf8",
        ),
      ),
    ),
  );
  let created = 0,
    existing = 0;
  const docs = [
    ...hallTemplates.map((hall) => ({
      ref: db.collection("hallTemplates").doc(hall.key),
      data: hallSchema.parse(hall),
    })),
    ...catalog({ ko: ko.ai, en: en.ai }).map(({ id, item }) => ({
      ref: db.collection("items").doc(id),
      data: contentSchema.parse(item),
    })),
  ];
  for (const { ref, data } of docs) {
    const added = await db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) return false;
      tx.create(ref, {
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (added) created++;
    else existing++;
  }
  return { created, existing };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await seed()));
  } catch (error) {
    console.error("Seed failed:", error.code || error.name);
    process.exitCode = 1;
  }
}
