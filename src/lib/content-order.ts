import type { PortalItem } from "./schema.ts";

type OrderedContent = Pick<
  PortalItem,
  "type" | "order" | "createdAt" | "publishedAt" | "pinned"
>;
// Pinned ranks are 0..100000; ordinary posts follow, newest first.
export function contentRank(item: OrderedContent): number {
  if (item.type === "ai" || item.pinned) return item.order;
  return 1_000_000_000_000_000 - (item.publishedAt || item.createdAt || 0);
}
export function compareContent(a: PortalItem, b: PortalItem): number {
  const left = `${a.scope}:${a.id}`,
    right = `${b.scope}:${b.id}`;
  return (
    contentRank(a) - contentRank(b) ||
    (left < right ? -1 : left > right ? 1 : 0)
  );
}
