import {getPublicHall} from '@/lib/server/public-hall';
import { getViewer } from "@/lib/server/session";
import { PublicTools } from "@/components/portal/public-tools";
import type { PortalItem } from "@/lib/schema";
export default async function ToolsPage() {
  const items=await getPublicHall('tools') as (PortalItem&{type:'tool'})[];
  return <PublicTools items={items} signedIn={!!await getViewer()}/>;
}
