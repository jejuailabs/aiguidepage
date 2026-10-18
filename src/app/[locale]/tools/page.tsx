import { getPublicHall } from "@/lib/server/public-hall";
import { getViewer } from "@/lib/server/session";
import { PublicTools } from "@/components/portal/public-tools";
import type { PortalItem } from "@/lib/schema";
export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ tool?: string }>;
}) {
  const [items, viewer, query] = await Promise.all([
    getPublicHall("tools"),
    getViewer(),
    searchParams,
  ]);
  return (
    <PublicTools
      items={items as (PortalItem & { type: "tool" })[]}
      signedIn={!!viewer}
      initialToolId={typeof query.tool === "string" ? query.tool : undefined}
    />
  );
}
