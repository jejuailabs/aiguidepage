import "server-only";
import ko from "../../../messages/ko.json" with { type: "json" };
import en from "../../../messages/en.json" with { type: "json" };
import { catalog } from "../../data/catalog.ts";
import { publicHallItems } from "./portal.ts";
import type { HallKey, PortalItem } from "../schema.ts";
export async function getPublicHall(
  hall: Exclude<HallKey, "ai">,
): Promise<PortalItem[]> {
  if (
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.FIRESTORE_EMULATOR_HOST
  )
    return publicHallItems(hall);
  const type = { prompts: "prompt", tools: "tool", games: "game" }[hall];
  return catalog({ ko: ko.ai, en: en.ai })
    .filter(
      (value) =>
        value.item.type === type &&
        value.item.public &&
        value.item.status === "published",
    )
    .map(({ id, item }) => ({ ...item, id, scope: "common", createdAt: 0 }));
}
