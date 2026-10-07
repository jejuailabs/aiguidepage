import { test } from "node:test";
import assert from "node:assert/strict";
import { compareContent, contentRank } from "../src/lib/content-order.ts";
const post = (id, createdAt, options = {}) => ({
  id,
  type: "prompt",
  scope: "common",
  order: 0,
  createdAt,
  ...options,
});
test("pinned priority and newest publication order ignore ordinary manual order and edits", () => {
  const posts = [
    post("old", 10, { order: 0, updatedAt: 999 }),
    post("new", 20, { order: 999 }),
    post("pin-second", 1, { pinned: true, order: 2 }),
    post("pin-first", 1, { pinned: true, order: 1 }),
    post("published-later", 0, { publishedAt: 30 }),
  ];
  assert.deepEqual(
    posts.sort(compareContent).map((i) => i.id),
    ["pin-first", "pin-second", "published-later", "new", "old"],
  );
  assert.ok(contentRank(post("old", 10)) > contentRank(post("new", 20)));
});
test("unpinning restores date order, equal dates use stable IDs, and AI order remains curated", () => {
  const posts = [
    post("old", 1, { pinned: false, order: 0 }),
    post("z", 2),
    post("a", 2),
  ];
  assert.deepEqual(
    posts.sort(compareContent).map((i) => i.id),
    ["a", "z", "old"],
  );
  assert.equal(contentRank(post("ai", 99, { type: "ai", order: 5 })), 5);
});
