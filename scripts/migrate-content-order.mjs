import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin.ts";
import { contentSchema } from "../src/lib/schema.ts";
import { contentRank } from "../src/lib/content-order.ts";
import { Timestamp } from "firebase-admin/firestore";

export async function migrateContentOrder(
  db = getFirebaseAdminFirestore(),
  apply = false,
) {
  const snapshots = await db.collectionGroup("items").get();
  let updated = 0,
    skipped = 0;
  for (const doc of snapshots.docs) {
    if (!/^items\/[^/]+$|^orgs\/[^/]+\/items\/[^/]+$/.test(doc.ref.path))
      continue;
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(doc.ref),
        stored = snapshot.data();
      if (
        !stored ||
        stored.type === "ai" ||
        typeof stored.feedRank === "number"
      ) {
        skipped++;
        return;
      }
      const item = contentSchema.parse(stored);
      const publishedAt =
        stored.publishedAt || stored.createdAt || Timestamp.fromMillis(0);
      const feedRank = contentRank({
        ...item,
        publishedAt: publishedAt.toMillis(),
        createdAt: 0,
      });
      if (apply) tx.update(doc.ref, { publishedAt, feedRank });
      updated++;
    });
  }
  return { apply, updated, skipped };
}
if (process.argv[1]?.endsWith("migrate-content-order.mjs")) {
  try {
    console.log(
      JSON.stringify(
        await migrateContentOrder(undefined, process.argv.includes("--apply")),
      ),
    );
  } catch (error) {
    console.error("Content order migration failed:", error.code || error.name);
    process.exitCode = 1;
  }
}
