import { pageViewer } from "@/lib/server/page";
import { createHash } from "node:crypto";
import {
  requireOrg,
  getHalls,
  requireHall,
  hallItems,
} from "@/lib/server/portal";
import { PortalError } from "@/lib/server/errors";
import { HallView } from "@/components/portal/hall-view";
import { AccessNotice } from "@/components/portal/access-notice";
export default async function HallPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; org: string; hall: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  const { locale, org, hall } = await params,
    query = await searchParams,
    viewer = await pageViewer(locale, `/o/${org}/${hall}${query.item?`?item=${encodeURIComponent(query.item)}`:''}`);
  let props;
  try {
    const [access, halls, selectedHall] = await Promise.all([
      requireOrg(viewer, org),
      getHalls(viewer, org),
      requireHall(viewer, org, hall),
    ]);
    const data = await hallItems(viewer, org, selectedHall.key);
    props = {
      viewer,
      org: access.org,
      role: access.role,
      halls,
      hall: selectedHall,
      initialItems: data.items,
      initialCursor: data.nextCursor,
      initialSelected: query.item?.slice(0, 210),
    };
  } catch (error) {
    return (
      <AccessNotice
        code={error instanceof PortalError ? error.code : "unavailable"}
      />
    );
  }
  const revision = createHash("sha256")
    .update(JSON.stringify([props.initialItems, props.initialCursor]))
    .digest("hex");
  return <HallView key={`${org}-${hall}-${revision}`} {...props} />;
}
