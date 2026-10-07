import { pageViewer } from "@/lib/server/page";
import { aiOverview } from "@/lib/server/portal";
import { PortalError } from "@/lib/server/errors";
import { AccessNotice } from "@/components/portal/access-notice";
import { AiAdmin } from "@/components/portal/ai-admin";
export default async function AiAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params,
    viewer = await pageViewer(locale, "/admin");
  let initial;
  try {
    initial = await aiOverview(viewer);
  } catch (error) {
    return (
      <AccessNotice
        code={error instanceof PortalError ? error.code : "unavailable"}
      />
    );
  }
  return <AiAdmin viewer={viewer} initial={initial} />;
}
