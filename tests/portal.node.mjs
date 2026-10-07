import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  getDoc,
  setDoc,
  doc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin.ts";
import * as portal from "../src/lib/server/portal.ts";
import { seed } from "../scripts/seed.mjs";
import { contentSchema } from "../src/lib/schema.ts";

if (
  process.env.GCLOUD_PROJECT !== "demo-aiguide" ||
  !process.env.FIRESTORE_EMULATOR_HOST
)
  throw new Error("Tests require the demo-aiguide emulator");
const db = getFirebaseAdminFirestore();
const owner = {
  uid: "test-owner",
  email: "owner@example.test",
  name: "Owner",
  platformAdmin: true,
};
const alice = {
  uid: "test-alice",
  email: "alice@example.test",
  name: "Alice",
  platformAdmin: false,
};
const bob = {
  uid: "test-bob",
  email: "bob@example.test",
  name: "Bob",
  platformAdmin: false,
};
const orgInput = (slug) => ({
  slug,
  name: { ko: slug, en: slug },
  theme: { palette: "gallery", mode: "light" },
  logoUrl: "",
  locales: ["ko", "en"],
  defaultLocale: "ko",
});
const expectCode = (code) => (error) => error.code === code;
let env;
after(async () => {
  await env?.cleanup();
  await db.terminate();
});
test("organization authorization, invite transactions, content and rules", async (t) => {
  await fetch(
    "http://127.0.0.1:8080/emulator/v1/projects/demo-aiguide/databases/(default)/documents",
    { method: "DELETE" },
  );
  assert.equal((await seed()).created, 38);
  assert.equal((await seed()).created, 0);
  await portal.ensureProfile(owner);
  await portal.createOrg(owner, orgInput("test-alpha"));
  await portal.createOrg(owner, orgInput("test-beta"));
  const invite = await portal.createInvite(owner, "test-alpha", {
    role: "member",
    days: 1,
    maxUses: 1,
    email: "",
  });
  await t.test(
    "only one concurrent redemption consumes a single-use invite",
    async () => {
      const outcomes = await Promise.allSettled([
        portal.joinOrg(alice, invite.code),
        portal.joinOrg(bob, invite.code),
      ]);
      assert.equal(
        outcomes.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assert.equal(
        (await db.doc(`invites/${invite.code}`).get()).data().uses,
        1,
      );
      const winner = outcomes[0].status === "fulfilled" ? alice : bob;
      assert.equal(
        (await portal.joinOrg(winner, invite.code)).alreadyMember,
        true,
      );
    },
  );
  const memberInvite = await portal.createInvite(owner, "test-alpha", {
    role: "member",
    days: 1,
    maxUses: 10,
    email: "",
  });
  await portal.joinOrg(alice, memberInvite.code);
  await portal.joinOrg(bob, memberInvite.code);
  await t.test(
    "cross-org, member mutations, self-demotion and last admin are denied",
    async () => {
      await assert.rejects(
        portal.requireOrg(alice, "test-beta"),
        expectCode("forbidden"),
      );
      await assert.rejects(
        portal.createInvite(alice, "test-alpha", {
          role: "admin",
          days: 1,
          maxUses: 1,
        }),
        expectCode("forbidden"),
      );
      await assert.rejects(
        portal.updateMember(owner, "test-alpha", owner.uid, "member"),
        expectCode("selfChange"),
      );
      await assert.rejects(
        portal.updateMember(
          { ...owner, uid: "other-operator" },
          "test-alpha",
          owner.uid,
          "member",
        ),
        expectCode("lastAdmin"),
      );
    },
  );
  await t.test(
    "expired and email-bound invites reject without consuming a use",
    async () => {
      const bound = await portal.createInvite(owner, "test-beta", {
        role: "member",
        days: 1,
        maxUses: 1,
        email: "bob@example.test",
      });
      await assert.rejects(
        portal.joinOrg(alice, bound.code),
        expectCode("inviteEmail"),
      );
      await db
        .doc(`invites/${bound.code}`)
        .update({ expiresAt: Timestamp.fromMillis(1) });
      await assert.rejects(
        portal.joinOrg(bob, bound.code),
        expectCode("expiredInvite"),
      );
      assert.equal(
        (await db.doc(`invites/${bound.code}`).get()).data().uses,
        0,
      );
    },
  );
  await t.test(
    "merged prompt cursor has no omissions or duplicates, including hidden and custom order",
    async () => {
      const base = (await db.doc("items/prompt-meeting").get()).data();
      for (let i = 0; i < 8; i++)
        await portal.saveItem(
          owner,
          "test-alpha",
          { ...base, order: i * 2, title: { ko: `조직 ${i}`, en: `Org ${i}` } },
          `own-${i}`,
        );
      await portal.saveOverride(owner, "test-alpha", "prompt-email", {
        hidden: true,
      });
      async function readAll() {
        let cursor;
        const items = [];
        for (let page = 0; page < 10; page++) {
          const data = await portal.hallItems(
            alice,
            "test-alpha",
            "prompts",
            cursor,
          );
          assert.ok(data.items.length <= 12);
          items.push(...data.items);
          if (!data.nextCursor) return items;
          cursor = data.nextCursor;
        }
        throw new Error("Cursor never ended");
      }
      const items = await readAll();
      assert.equal(items.length, 25);
      assert.equal(new Set(items.map(portal.itemKey)).size, 25);
      assert.ok(!items.some((i) => i.id === "prompt-email"));
      await portal.saveOverride(owner, "test-alpha", "prompt-revise", {
        hidden: false,
        order: 0,
      });
      const reordered = await readAll();
      assert.equal(reordered.length, 25);
      assert.ok(reordered.findIndex((i) => i.id === "prompt-revise") < 3);
    },
  );
  await t.test(
    "disabled halls reject direct access, search and favorites",
    async () => {
      await portal.saveHall(owner, "test-alpha", {
        key: "games",
        title: { ko: "게임", en: "Games" },
        enabled: false,
        order: 3,
      });
      await assert.rejects(
        portal.hallItems(alice, "test-alpha", "games"),
        expectCode("hallDisabled"),
      );
      await assert.rejects(
        portal.favorite(alice, "test-alpha", "common", "game-memory", true),
        expectCode("hallDisabled"),
      );
      assert.ok(
        !(await portal.searchItems(alice, "test-alpha", "AI")).some(
          (g) => g.hall === "games",
        ),
      );
      for (const key of ["tools", "prompts"])
        await portal.saveHall(owner, "test-alpha", {
          key,
          title: { ko: key, en: key },
          enabled: false,
          order: 1,
        });
      await assert.rejects(
        portal.saveHall(owner, "test-alpha", {
          key: "ai",
          title: { ko: "AI", en: "AI" },
          enabled: false,
          order: 0,
        }),
        expectCode("lastHall"),
      );
    },
  );
  await t.test(
    "favorites disappear after membership removal and orgs are isolated",
    async () => {
      await portal.favorite(alice, "test-alpha", "common", "claude", true);
      assert.equal((await portal.favorites(alice)).length, 1);
      await portal.updateMember(owner, "test-alpha", alice.uid, "remove");
      assert.equal((await portal.favorites(alice)).length, 0);
      assert.equal((await portal.listMyOrgs(alice)).orgs.length, 0);
      await portal.joinOrg(alice, memberInvite.code);
    },
  );
  await t.test(
    "quiz answers and templates are validated on the server",
    async () => {
      const quiz = (await db.doc("items/game-quiz").get()).data();
      quiz.data.questions[0].answer = 3;
      assert.equal(contentSchema.safeParse(quiz).success, false);
      const template = (await db.doc("items/tool-template-fill").get()).data();
      delete template.data.template;
      assert.equal(contentSchema.safeParse(template).success, false);
    },
  );
  await t.test(
    "prompt attachments require a finalized same-org or common upload",
    async () => {
      const asset = {
        id: "00000000-0000-4000-8000-000000000001",
        type: "image",
        name: "reference.png",
        url: "https://example.test/reference.png",
        mime: "image/png",
        size: 100,
      };
      const prompt = {
        type: "prompt",
        title: { ko: "첨부 검사", en: "Attachment test" },
        summary: { ko: "검증", en: "Validation" },
        category: "image",
        order: 0,
        status: "draft",
        data: {
          aiSlug: "gemini",
          text: { ko: "이미지 사용", en: "Use the image" },
          referenceImages: [asset],
        },
      };
      await assert.rejects(
        portal.saveItem(owner, "test-alpha", prompt, "media-check"),
        expectCode("invalidMedia"),
      );
      const record = db.collection("mediaUploads").doc(asset.id);
      await record.set({
        state: "pending",
        orgId: "test-alpha",
        asset,
        attachments: [],
      });
      await assert.rejects(
        portal.saveItem(owner, "test-alpha", prompt, "media-check"),
        expectCode("invalidMedia"),
      );
      await record.update({ state: "ready", orgId: "test-beta" });
      await assert.rejects(
        portal.saveItem(owner, "test-alpha", prompt, "media-check"),
        expectCode("invalidMedia"),
      );
      await record.update({ orgId: "test-alpha" });
      await portal.saveItem(owner, "test-alpha", prompt, "media-check");
      assert.deepEqual((await record.get()).data().attachments, [
        "orgs/test-alpha/items/media-check",
      ]);
      await assert.rejects(
        portal.saveItem(owner, null, prompt, "media-check"),
        expectCode("invalidMedia"),
      );
      await portal.saveItem(
        owner,
        "test-alpha",
        { ...prompt, data: { ...prompt.data, referenceImages: [] } },
        "media-check",
      );
      assert.deepEqual((await record.get()).data().attachments, []);
      await record.update({ orgId: null });
      await portal.saveItem(owner, "test-beta", prompt, "media-check");
      assert.deepEqual((await record.get()).data().attachments, [
        "orgs/test-beta/items/media-check",
      ]);
    },
  );
  await t.test(
    "Firestore rules deny forged membership, other tenants, private public reads and client writes",
    async () => {
      env = await initializeTestEnvironment({
        projectId: "demo-aiguide",
        firestore: {
          host: "127.0.0.1",
          port: 8080,
          rules: await readFile("firestore.rules", "utf8"),
        },
      });
      const member = env
        .authenticatedContext(alice.uid, { email_verified: true })
        .firestore();
      const admin = env
        .authenticatedContext(owner.uid, {
          email_verified: true,
          platformAdmin: true,
        })
        .firestore();
      const anon = env.unauthenticatedContext().firestore();
      const unverified = env
        .authenticatedContext("unverified", { email_verified: false })
        .firestore();
      await assertSucceeds(getDoc(doc(member, "orgs/test-alpha")));
      await assertFails(getDoc(doc(member, "orgs/test-beta")));
      await assertFails(
        setDoc(doc(member, `orgs/test-beta/members/${alice.uid}`), {
          role: "admin",
        }),
      );
      await assertFails(
        setDoc(doc(member, `users/${alice.uid}`), {
          platformAdmin: true,
          orgIds: ["test-beta"],
        }),
      );
      await assertFails(
        setDoc(doc(admin, "items/claude"), { status: "archived" }),
      );
      await assertFails(getDoc(doc(anon, "items/prompt-meeting")));
      await assertFails(getDoc(doc(unverified, "orgs/test-alpha")));
      await assertSucceeds(
        getDocs(
          query(
            collection(anon, "items"),
            where("public", "==", true),
            where("status", "==", "published"),
          ),
        ),
      );
      await assertFails(getDocs(collection(anon, "items")));
      await assertFails(
        getDoc(
          doc(member, "mediaUploads/00000000-0000-4000-8000-000000000001"),
        ),
      );
      await assertFails(
        setDoc(
          doc(member, "mediaUploads/00000000-0000-4000-8000-000000000001"),
          { state: "ready" },
        ),
      );
      await db.doc("orgs/test-alpha").update({ status: "suspended" });
      await assertFails(getDoc(doc(member, "orgs/test-alpha")));
      await assert.rejects(
        portal.requireOrg(alice, "test-alpha"),
        expectCode("suspended"),
      );
      await db.doc("orgs/test-alpha").update({ status: "active" });
    },
  );
});
