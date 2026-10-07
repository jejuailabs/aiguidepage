import { redirect } from "next/navigation";
import { pageViewer } from "@/lib/server/page";
import { listMyOrgs } from "@/lib/server/portal";
import { OrgPicker } from "@/components/portal/org-picker";
import { AccessNotice } from "@/components/portal/access-notice";
export default async function OrgsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ choose?: string }>;
}) {
  const { locale } = await params,
    viewer = await pageViewer(locale, "/orgs");
  let data;
  try {
    data = await listMyOrgs(viewer);
  } catch {
    return <AccessNotice code="unavailable" />;
  }
  const query = await searchParams;
  if (!query.choose) {
    const selected =
      data.orgs.find((org: { id: string }) => org.id === data.lastOrgId) ||
      (data.orgs.length === 1 ? data.orgs[0] : null);
    if (selected) redirect(`/${locale}/o/${selected.id}`);
  }
  return <OrgPicker viewer={viewer} orgs={data.orgs} />;
}
