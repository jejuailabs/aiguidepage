import { redirect } from "next/navigation";
import { pageViewer } from "@/lib/server/page";
import { AccessNotice } from "@/components/portal/access-notice";
import { PortalError } from "@/lib/server/errors";
import { requireHall } from "@/lib/server/portal";
export default async function ItemPage({
  params,
}: {
  params: Promise<{ locale: string; org: string; hall: string; item: string }>;
}) {
  const { locale, org, hall, item } = await params;
  const viewer = await pageViewer(locale, `/o/${org}/${hall}/${item}`);
  try {
    await requireHall(viewer, org, hall);
  } catch (error) {
    return (
      <AccessNotice
        code={error instanceof PortalError ? error.code : "unavailable"}
      />
    );
  }
  redirect(
    `/${locale}/o/${org}/${hall}?item=${encodeURIComponent(item.includes(":") ? item : `common:${item}`)}`,
  );
}
