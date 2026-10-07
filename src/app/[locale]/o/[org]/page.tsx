import { redirect } from "next/navigation";
import { pageViewer } from "@/lib/server/page";
import { getHalls, selectOrg } from "@/lib/server/portal";
import { PortalError } from "@/lib/server/errors";
import { AccessNotice } from "@/components/portal/access-notice";
export default async function OrgHome({
  params,
}: {
  params: Promise<{ locale: string; org: string }>;
}) {
  const { locale, org } = await params,
    viewer = await pageViewer(locale, `/o/${org}`);
  let halls;
  try {
    halls = await getHalls(viewer, org);
    await selectOrg(viewer, org);
  } catch (error) {
    return (
      <AccessNotice
        code={error instanceof PortalError ? error.code : "unavailable"}
      />
    );
  }
  const first = halls.find((hall) => hall.enabled);
  if (!first) return <AccessNotice code="hallDisabled" />;
  redirect(`/${locale}/o/${org}/${first.key}`);
}
