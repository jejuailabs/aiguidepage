import { getPublicHall } from "@/lib/server/public-hall";
import { getViewer } from "@/lib/server/session";
import { PublicTools } from "@/components/portal/public-tools";
import type { PortalItem } from "@/lib/schema";
export default async function ToolsPage() {
  const [items, viewer] = await Promise.all([
    getPublicHall("tools"),
    getViewer(),
  ]);
  return (
    <PublicTools
      items={items as (PortalItem & { type: "tool" })[]}
      signedIn={!!viewer}
    />
  );
}
