import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import {
  FieldPath,
  FieldValue,
  Timestamp,
  type Query,
  type DocumentSnapshot,
} from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "../firebase/admin.ts";
import {
  contentSchema,
  hallSchema,
  orgSchema,
  inviteSchema,
  prefsSchema,
  hallKeys,
  hallType,
  type HallKey,
  type Viewer,
  type Org,
  type PortalItem,
} from "../schema.ts";
import { PortalError } from "./errors.ts";
import { readContentPage } from "./content-query.ts";

const db = () => getFirebaseAdminFirestore();
const validId = (value: string) => {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new PortalError("invalid");
  return value;
};
export const orgRef = (id: string) => db().collection("orgs").doc(validId(id));
const userRef = (uid: string) => db().collection("users").doc(uid);
const asItem = (
  doc: DocumentSnapshot,
  scope: "common" | "org",
  orgId?: string,
): PortalItem => {
  const data = doc.data();
  return {
    ...contentSchema.parse(data),
    id: doc.id,
    scope,
    ...(orgId ? { orgId } : {}),
    createdAt: data?.createdAt?.toMillis?.() || 0,
    updatedAt: data?.updatedAt?.toMillis?.() || 0,
  };
};
export const itemKey = (item: Pick<PortalItem, "scope" | "id">) =>
  `${item.scope}:${item.id}`;

export async function ensureProfile(viewer: Viewer) {
  await db().runTransaction(async (tx) => {
    const ref = userRef(viewer.uid),
      doc = await tx.get(ref);
    tx.set(
      ref,
      {
        displayName: viewer.name,
        email: viewer.email,
        ...(!doc.exists
          ? { orgIds: [], createdAt: FieldValue.serverTimestamp() }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}
export async function listMyOrgs(viewer: Viewer) {
  const user = (await userRef(viewer.uid).get()).data();
  const ids = (user?.orgIds || []) as string[];
  const orgs = (
    await Promise.all(
      ids.map(async (id) => {
        const [doc, member] = await Promise.all([
          orgRef(id).get(),
          orgRef(id).collection("members").doc(viewer.uid).get(),
        ]);
        return doc.exists && doc.data()?.status === "active" && member.exists
          ? { id: doc.id, ...doc.data(), role: member.data()?.role }
          : null;
      }),
    )
  ).filter(Boolean);
  return JSON.parse(
    JSON.stringify({
      viewer,
      orgs,
      lastOrgId: user?.lastOrgId,
      prefs: user?.prefs || null,
    }),
  );
}
export async function requireOrg(viewer: Viewer, id: string, admin = false) {
  const [doc, member] = await Promise.all([
    orgRef(id).get(),
    orgRef(id).collection("members").doc(viewer.uid).get(),
  ]);
  if (!doc.exists || (!member.exists && !viewer.platformAdmin))
    throw new PortalError("forbidden", 403);
  if (doc.data()?.status !== "active" && !viewer.platformAdmin)
    throw new PortalError("suspended", 403);
  if (admin && member.data()?.role !== "admin" && !viewer.platformAdmin)
    throw new PortalError("forbidden", 403);
  return {
    org: JSON.parse(JSON.stringify({ ...doc.data(), id: doc.id })) as Org,
    role: viewer.platformAdmin
      ? "admin"
      : (member.data()?.role as "admin" | "member"),
  };
}
export async function getHalls(viewer: Viewer, id: string) {
  await requireOrg(viewer, id);
  return (await orgRef(id).collection("halls").orderBy("order").get()).docs.map(
    (doc) => hallSchema.parse(doc.data()),
  );
}
export async function requireHall(viewer: Viewer, id: string, hall: string) {
  await requireOrg(viewer, id);
  if (!hallKeys.includes(hall as HallKey))
    throw new PortalError("notFound", 404);
  const doc = await orgRef(id).collection("halls").doc(hall).get();
  if (!doc.exists || !doc.data()?.enabled)
    throw new PortalError("hallDisabled", 403);
  return hallSchema.parse(doc.data());
}
type SourceCursor = { order: number; id: string };
type FeedCursor = { common?: SourceCursor; org?: SourceCursor; after?: string };
function decodeCursor(raw?: string): FeedCursor {
  if (!raw) return {};
  if (raw.length > 3000) throw new PortalError("invalid");
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString());
    for (const key of ["common", "org"])
      if (
        value[key] &&
        (!Number.isFinite(value[key].order) ||
          typeof value[key].id !== "string" ||
          !/^[\w-]{1,100}$/.test(value[key].id))
      )
        throw new Error();
    if (
      value.after &&
      (typeof value.after !== "string" || value.after.length > 210)
    )
      throw new Error();
    return value;
  } catch {
    throw new PortalError("invalid");
  }
}
const encodeCursor = (value: FeedCursor) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
async function allItems(
  query: Query,
  scope: "common" | "org",
  id?: string,
  scan: Query = query,
) {
  const items: PortalItem[] = [];
  let last: DocumentSnapshot | undefined;
  for (;;) {
    let page = query
      .orderBy("order")
      .orderBy(FieldPath.documentId())
      .limit(100);
    if (last) page = page.startAfter(last);
    let fallback = scan
      .orderBy("order")
      .orderBy(FieldPath.documentId())
      .limit(100);
    if (last) fallback = fallback.startAfter(last);
    const result = await readContentPage(page, fallback);
    items.push(...result.docs.map((doc) => asItem(doc, scope, id)));
    if (result.size < 100) return items;
    last = result.docs.at(-1);
  }
}
export async function publicItems() {
  const collection = db().collection("items");
  const query = collection
    .where("status", "==", "published")
    .where("type", "==", "ai");
  return (await allItems(query, "common", undefined, collection)).filter(
    (item) => item.status === "published" && item.type === "ai" && item.public,
  );
}
export async function hallItems(
  viewer: Viewer,
  id: string,
  hall: HallKey,
  rawCursor?: string,
  all = false,
) {
  await requireHall(viewer, id, hall);
  const overridesSnap = await orgRef(id).collection("overrides").get();
  const overrides = Object.fromEntries(
    overridesSnap.docs.map((doc) => [doc.id, doc.data()]),
  );
  const common = db()
    .collection("items")
    .where("status", "==", "published")
    .where("type", "==", hallType[hall]);
  const own = orgRef(id)
    .collection("items")
    .where("status", "==", "published")
    .where("type", "==", hallType[hall]);
  const cursor = decodeCursor(rawCursor);
  const compare = (a: PortalItem, b: PortalItem) =>
    a.order - b.order ||
    (itemKey(a) < itemKey(b) ? -1 : itemKey(a) > itemKey(b) ? 1 : 0);
  const adjust = (items: PortalItem[]) =>
    items
      .filter(
        (item) => item.status === "published" && item.type === hallType[hall],
      )
      .filter((item) => item.scope !== "common" || !overrides[item.id]?.hidden)
      .map((item) =>
        item.scope === "common" && typeof overrides[item.id]?.order === "number"
          ? { ...item, order: overrides[item.id].order }
          : item,
      );
  // A custom common-item order requires sorting the complete effective collection.
  if (
    all ||
    hall !== "prompts" ||
    Object.values(overrides).some((value) => typeof value.order === "number")
  ) {
    const items = adjust(
      (
        await Promise.all([
          allItems(common, "common", undefined, db().collection("items")),
          allItems(own, "org", id, orgRef(id).collection("items")),
        ])
      ).flat(),
    ).sort(compare);
    const start = cursor.after
      ? items.findIndex((item) => itemKey(item) === cursor.after) + 1
      : 0;
    const batch =
      all || hall !== "prompts" ? items : items.slice(start, start + 12);
    return {
      items: batch,
      nextCursor:
        !all && hall === "prompts" && start + 12 < items.length
          ? encodeCursor({ after: itemKey(batch.at(-1)!) })
          : null,
    };
  }
  async function source(
    query: Query,
    scope: "common" | "org",
    start?: SourceCursor,
  ) {
    const items: PortalItem[] = [];
    let position = start;
    let more = true;
    while (items.length < 13 && more) {
      let page = query
        .orderBy("order")
        .orderBy(FieldPath.documentId())
        .limit(13);
      if (position) page = page.startAfter(position.order, position.id);
      let fallback = (
        scope === "common"
          ? db().collection("items")
          : orgRef(id).collection("items")
      )
        .orderBy("order")
        .orderBy(FieldPath.documentId())
        .limit(13);
      if (position) fallback = fallback.startAfter(position.order, position.id);
      const snapshot = await readContentPage(page, fallback);
      more = snapshot.size === 13;
      for (const doc of snapshot.docs) {
        const item = asItem(doc, scope, scope === "org" ? id : undefined);
        position = { order: item.order, id: item.id };
        if (
          item.status === "published" &&
          item.type === hallType[hall] &&
          (scope === "org" || !overrides[item.id]?.hidden)
        )
          items.push(item);
      }
    }
    return { items, more, position };
  }
  const [a, b] = await Promise.all([
    source(common, "common", cursor.common),
    source(own, "org", cursor.org),
  ]);
  const merged = [...a.items, ...b.items].sort(compare),
    items = merged.slice(0, 12);
  const next: FeedCursor = { common: cursor.common, org: cursor.org };
  for (const item of items)
    next[item.scope] = { order: item.order, id: item.id };
  if (!a.items.length) next.common = a.position;
  if (!b.items.length) next.org = b.position;
  return {
    items,
    nextCursor:
      merged.length > 12 || a.more || b.more ? encodeCursor(next) : null,
  };
}
export async function searchItems(viewer: Viewer, id: string, query: string) {
  const halls = (await getHalls(viewer, id)).filter((hall) => hall.enabled);
  const needle = query.trim().toLowerCase().slice(0, 100);
  if (!needle) return [];
  return (
    await Promise.all(
      halls.map(async (hall) => ({
        hall: hall.key,
        items: (
          await hallItems(viewer, id, hall.key, undefined, true)
        ).items.filter((item) =>
          JSON.stringify([item.title, item.summary, item.category])
            .toLowerCase()
            .includes(needle),
        ),
      })),
    )
  ).filter((group) => group.items.length);
}
export async function createOrg(viewer: Viewer, input: unknown) {
  if (!viewer.platformAdmin) throw new PortalError("forbidden", 403);
  const value = orgSchema.parse(input),
    ref = orgRef(value.slug),
    code = makeCode();
  const templates = await db().collection("hallTemplates").get();
  if (templates.size !== 4) throw new PortalError("notReady", 503);
  await db().runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) throw new PortalError("duplicate");
    const { firstAdminEmail, ...org } = value;
    tx.create(ref, {
      ...org,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (const template of templates.docs)
      tx.create(ref.collection("halls").doc(template.id), template.data());
    tx.create(ref.collection("members").doc(viewer.uid), {
      role: "admin",
      displayName: viewer.name,
      email: viewer.email,
      joinedAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      userRef(viewer.uid),
      { orgIds: FieldValue.arrayUnion(value.slug) },
      { merge: true },
    );
    tx.create(db().collection("invites").doc(code), {
      orgId: value.slug,
      role: "admin",
      email: firstAdminEmail?.toLowerCase() || "",
      expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86400000),
      maxUses: 1,
      uses: 0,
      createdBy: viewer.uid,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { id: value.slug, code };
}
function makeCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return (
    "AI-" +
    Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join(
      "",
    )
  );
}
export async function createInvite(viewer: Viewer, id: string, input: unknown) {
  await requireOrg(viewer, id, true);
  const value = inviteSchema.parse(input),
    code = makeCode();
  await db()
    .collection("invites")
    .doc(code)
    .create({
      orgId: id,
      role: value.role,
      email: value.email.toLowerCase(),
      expiresAt: Timestamp.fromMillis(Date.now() + value.days * 86400000),
      maxUses: value.maxUses,
      uses: 0,
      createdBy: viewer.uid,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    });
  return { code };
}
export async function joinOrg(viewer: Viewer, raw: string) {
  const code = raw.trim().toUpperCase();
  if (!/^AI-[A-Z2-9]{8}$/.test(code)) throw new PortalError("invalidInvite");
  const invite = db().collection("invites").doc(code);
  return db().runTransaction(async (tx) => {
    const doc = await tx.get(invite),
      value = doc.data();
    if (!value || !value.active) throw new PortalError("invalidInvite");
    if (value.expiresAt.toMillis() <= Date.now())
      throw new PortalError("expiredInvite");
    if (value.email && value.email !== viewer.email.toLowerCase())
      throw new PortalError("inviteEmail");
    const ref = orgRef(value.orgId),
      member = ref.collection("members").doc(viewer.uid);
    const [org, existing] = await Promise.all([tx.get(ref), tx.get(member)]);
    if (!org.exists || org.data()?.status !== "active")
      throw new PortalError("suspended");
    if (existing.exists) return { id: ref.id, alreadyMember: true };
    if (value.uses >= value.maxUses) throw new PortalError("usedInvite");
    tx.create(member, {
      role: value.role,
      displayName: viewer.name,
      email: viewer.email,
      joinedAt: FieldValue.serverTimestamp(),
      invitedBy: value.createdBy,
    });
    tx.update(invite, { uses: FieldValue.increment(1) });
    tx.set(
      userRef(viewer.uid),
      { orgIds: FieldValue.arrayUnion(ref.id), lastOrgId: ref.id },
      { merge: true },
    );
    return { id: ref.id, alreadyMember: false };
  });
}
export async function adminOverview(viewer: Viewer, id: string) {
  const access = await requireOrg(viewer, id, true);
  const [members, halls, items, common, overrides, invites] = await Promise.all(
    [
      orgRef(id).collection("members").get(),
      getHalls(viewer, id),
      orgRef(id).collection("items").get(),
      db().collection("items").get(),
      orgRef(id).collection("overrides").get(),
      db().collection("invites").where("orgId", "==", id).get(),
    ],
  );
  return JSON.parse(
    JSON.stringify({
      ...access,
      members: members.docs.map((d) => ({ uid: d.id, ...d.data() })),
      halls,
      items: items.docs.map((d) => asItem(d, "org", id)),
      common: common.docs.map((d) => asItem(d, "common")),
      overrides: Object.fromEntries(
        overrides.docs.map((d) => [d.id, d.data()]),
      ),
      invites: invites.docs.map((d) => ({
        code: d.id,
        ...d.data(),
        active:
          d.data().active &&
          d.data().expiresAt.toMillis() > Date.now() &&
          d.data().uses < d.data().maxUses,
        expiresAt: d.data().expiresAt.toMillis(),
      })),
    }),
  );
}
export async function saveHall(viewer: Viewer, id: string, input: unknown) {
  await requireOrg(viewer, id, true);
  const hall = hallSchema.parse(input);
  await db().runTransaction(async (tx) => {
    const snapshot = await tx.get(orgRef(id).collection("halls"));
    if (
      !hall.enabled &&
      !snapshot.docs.some((doc) => doc.id !== hall.key && doc.data().enabled)
    )
      throw new PortalError("lastHall");
    tx.set(orgRef(id).collection("halls").doc(hall.key), hall, { merge: true });
  });
}
export async function saveOrg(viewer: Viewer, id: string, input: unknown) {
  await requireOrg(viewer, id, true);
  const { slug, firstAdminEmail, ...value } = orgSchema.parse(input);
  void firstAdminEmail;
  if (slug !== id) throw new PortalError("invalid");
  await orgRef(id).update({
    ...value,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
export async function saveItem(
  viewer: Viewer,
  id: string | null,
  input: unknown,
  itemId?: string,
) {
  if (id) await requireOrg(viewer, id, true);
  else if (!viewer.platformAdmin) throw new PortalError("forbidden", 403);
  const item = contentSchema.parse(input),
    collection = id ? orgRef(id).collection("items") : db().collection("items");
  const ref = collection.doc(itemId ? validId(itemId) : randomUUID());
  const existing = await ref.get();
  await ref.set({
    ...item,
    public: id ? false : item.public,
    createdAt: existing.data()?.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: viewer.uid,
  });
  return { id: ref.id };
}
export async function updateMember(
  viewer: Viewer,
  id: string,
  uid: string,
  role: "admin" | "member" | "remove",
) {
  await requireOrg(viewer, id, true);
  if (uid === viewer.uid) throw new PortalError("selfChange");
  const ref = orgRef(id).collection("members").doc(validId(uid));
  await db().runTransaction(async (tx) => {
    const [member, admins] = await Promise.all([
      tx.get(ref),
      tx.get(orgRef(id).collection("members").where("role", "==", "admin")),
    ]);
    if (!member.exists) throw new PortalError("notFound", 404);
    if (member.data()?.role === "admin" && role !== "admin" && admins.size <= 1)
      throw new PortalError("lastAdmin");
    if (role === "remove") {
      tx.delete(ref);
      tx.set(
        userRef(uid),
        { orgIds: FieldValue.arrayRemove(id), lastOrgId: FieldValue.delete() },
        { merge: true },
      );
    } else tx.update(ref, { role });
  });
}
export async function saveOverride(
  viewer: Viewer,
  id: string,
  itemId: string,
  input: { hidden: boolean; order?: number },
) {
  await requireOrg(viewer, id, true);
  validId(itemId);
  if (
    typeof input.hidden !== "boolean" ||
    (input.order !== undefined &&
      (!Number.isInteger(input.order) ||
        input.order < 0 ||
        input.order > 100000))
  )
    throw new PortalError("invalid");
  await orgRef(id).collection("overrides").doc(itemId).set(input);
}
export async function revokeInvite(viewer: Viewer, id: string, code: string) {
  await requireOrg(viewer, id, true);
  validId(code);
  const ref = db().collection("invites").doc(code),
    doc = await ref.get();
  if (doc.data()?.orgId !== id) throw new PortalError("forbidden", 403);
  await ref.update({ active: false });
}
export async function platformOverview(viewer: Viewer) {
  if (!viewer.platformAdmin) throw new PortalError("forbidden", 403);
  const orgs = await db().collection("orgs").get(),
    items = await db().collection("items").get();
  return JSON.parse(
    JSON.stringify({
      orgs: await Promise.all(
        orgs.docs.map(async (doc) => ({
          id: doc.id,
          ...doc.data(),
          memberCount: (
            await doc.ref.collection("members").count().get()
          ).data().count,
        })),
      ),
      items: items.docs.map((d) => asItem(d, "common")),
    }),
  );
}
export async function savePreferences(viewer: Viewer, input: unknown) {
  await userRef(viewer.uid).set(
    { prefs: prefsSchema.parse(input) },
    { merge: true },
  );
}
export async function selectOrg(viewer: Viewer, id: string) {
  await requireOrg(viewer, id);
  await userRef(viewer.uid).set({ lastOrgId: id }, { merge: true });
}
export async function favorite(
  viewer: Viewer,
  id: string,
  scope: "common" | "org",
  itemId: string,
  enabled: boolean,
) {
  await requireOrg(viewer, id);
  const ref =
    scope === "org"
      ? orgRef(id).collection("items").doc(validId(itemId))
      : db().collection("items").doc(validId(itemId));
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.status !== "published")
    throw new PortalError("notFound", 404);
  const hall = hallKeys.find((key) => hallType[key] === doc.data()?.type)!;
  await requireHall(viewer, id, hall);
  const hidden =
    scope === "common"
      ? (await orgRef(id).collection("overrides").doc(itemId).get()).data()
          ?.hidden
      : false;
  if (hidden) throw new PortalError("notFound", 404);
  const target = userRef(viewer.uid)
    .collection("favorites")
    .doc(`${id}--${scope}--${itemId}`);
  if (enabled) await target.set({ orgId: id, scope, itemId, hall });
  else await target.delete();
}
export async function favorites(viewer: Viewer) {
  const docs = (await userRef(viewer.uid).collection("favorites").get()).docs;
  const result = await Promise.all(
    docs.map(async (favorite) => {
      const data = favorite.data();
      try {
        const items = await hallItems(
          viewer,
          data.orgId,
          data.hall,
          undefined,
          true,
        );
        const item = items.items.find(
          (i) => i.id === data.itemId && i.scope === data.scope,
        );
        return item ? { ...data, key: favorite.id, item } : null;
      } catch {
        return null;
      }
    }),
  );
  return result.filter(Boolean);
}
