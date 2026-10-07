import { pageViewer } from "@/lib/server/page";
import { platformOverview } from "@/lib/server/portal";
import { PortalError } from "@/lib/server/errors";
import { PlatformDashboard } from "@/components/portal/platform-dashboard";
import { AccessNotice } from "@/components/portal/access-notice";
export default async function PlatformPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params,
    viewer = await pageViewer(locale, "/platform");
  let data;
  try {
    data = await platformOverview(viewer);
  } catch (error) {
    return (
      <AccessNotice
        code={error instanceof PortalError ? error.code : "unavailable"}
      />
    );
  }
  return <PlatformDashboard viewer={viewer} initial={data} />;
}
