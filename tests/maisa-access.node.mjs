import { test, after } from "node:test";
import assert from "node:assert/strict";
import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin.ts";
import {
  authorizeMaisaTool,
  reserveMaisaRun,
} from "../src/lib/server/maisa-access.ts";
import { maisaTools } from "../src/lib/maisa-tools.ts";
if (
  process.env.GCLOUD_PROJECT !== "demo-aiguide" ||
  !process.env.FIRESTORE_EMULATOR_HOST
)
  throw new Error("Requires demo-aiguide emulator");
const db = getFirebaseAdminFirestore();
after(() => db.terminate());
const viewer = {
  uid: "maisa-viewer",
  email: "maisa@example.test",
  name: "Test",
  platformAdmin: false,
};
const definition = maisaTools.find((tool) => tool.slug === "format");
const item = {
  type: "tool",
  title: definition.title,
  summary: definition.summary,
  category: "work",
  order: 0,
  status: "published",
  public: true,
  data: { toolKey: definition.key },
};
test("AI execution respects publication, membership, hall visibility and common-item overrides", async () => {
  await db.doc("items/maisa-access-test").set(item);
  const input = { scope: "common", itemId: "maisa-access-test" };
  await authorizeMaisaTool(viewer, input, definition.key);
  await assert.rejects(
    authorizeMaisaTool(viewer, input, "maisa-receipt"),
    (error) => error.status === 403,
  );
  await db.doc("items/maisa-access-test").update({ public: false });
  await assert.rejects(
    authorizeMaisaTool(viewer, input, definition.key),
    (error) => error.status === 403,
  );
  await db
    .doc("orgs/maisa-org")
    .set({
      status: "active",
      slug: "maisa-org",
      name: { ko: "테스트", en: "Test" },
    });
  await db.doc(`orgs/maisa-org/members/${viewer.uid}`).set({ role: "member" });
  await db
    .doc("orgs/maisa-org/halls/tools")
    .set({
      key: "tools",
      enabled: true,
      order: 2,
      title: { ko: "AI 도구", en: "Tools" },
    });
  const orgInput = { ...input, orgId: "maisa-org" };
  await authorizeMaisaTool(viewer, orgInput, definition.key);
  await db
    .doc("orgs/maisa-org/overrides/maisa-access-test")
    .set({ hidden: true });
  await assert.rejects(
    authorizeMaisaTool(viewer, orgInput, definition.key),
    (error) => error.status === 403,
  );
  await db.doc("orgs/maisa-org/overrides/maisa-access-test").delete();
  await db.doc("orgs/maisa-org/halls/tools").update({ enabled: false });
  await assert.rejects(
    authorizeMaisaTool(viewer, orgInput, definition.key),
    (error) => error.status === 403,
  );
  await assert.rejects(
    authorizeMaisaTool(
      { ...viewer, uid: "other-person" },
      orgInput,
      definition.key,
    ),
    (error) => error.status === 403,
  );
});
test("concurrent AI calls are serialized and daily limits cannot be bypassed by retries", async () => {
  process.env.AI_USER_DAILY_LIMIT = "1";
  process.env.AI_DAILY_LIMIT = "100";
  const uid = `maisa-quota-${Date.now()}`;
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () => reserveMaisaRun(uid)),
  );
  const allowed = results.filter((result) => result.status === "fulfilled");
  assert.equal(allowed.length, 1);
  await allowed[0].value();
  await assert.rejects(
    reserveMaisaRun(uid),
    (error) => error.code === "dailyLimit",
  );
});
