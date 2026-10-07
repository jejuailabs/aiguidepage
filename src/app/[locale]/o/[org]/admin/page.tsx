import { pageViewer } from "@/lib/server/page";
import { adminOverview } from "@/lib/server/portal";
import { PortalError } from "@/lib/server/errors";
import { AdminDashboard } from "@/components/portal/admin-dashboard";
import { AccessNotice } from "@/components/portal/access-notice";
export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string; org: string }>;
}) {
  const { locale, org } = await params,
    viewer = await pageViewer(locale, `/o/${org}/admin`);
  let data;
  try {
    data = await adminOverview(viewer, org);
  } catch (error) {
    return (
      <AccessNotice
        code={error instanceof PortalError ? error.code : "unavailable"}
      />
    );
  }
  return <AdminDashboard viewer={viewer} initial={data} />;
}
