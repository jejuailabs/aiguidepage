import ko from "../../../../messages/ko.json";
import en from "../../../../messages/en.json";
import { catalog } from "@/data/catalog";
import { getViewer } from "@/lib/server/session";
import { PublicTools } from "@/components/portal/public-tools";
import type { PortalItem } from "@/lib/schema";
export default async function ToolsPage() {
  const items=catalog({ko:ko.ai,en:en.ai}).filter(value=>value.item.type==="tool").map(value=>({...value.item,id:value.id,scope:"common",createdAt:0})) as (PortalItem&{type:"tool"})[];
  return <PublicTools items={items} signedIn={!!await getViewer()}/>;
}
