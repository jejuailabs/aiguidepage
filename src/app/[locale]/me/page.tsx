import { pageViewer } from "@/lib/server/page";
import { favorites, listMyOrgs } from "@/lib/server/portal";
import { Profile } from "@/components/portal/profile";
import { AccessNotice } from "@/components/portal/access-notice";
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params,
    viewer = await pageViewer(locale, "/me");
  let data, organizations;
  try {
    const [saved, membership] = await Promise.all([
      favorites(viewer),
      listMyOrgs(viewer),
    ]);
    data = saved as React.ComponentProps<typeof Profile>["favorites"];
    organizations = membership.orgs;
  } catch {
    return <AccessNotice code="unavailable" />;
  }
  return <Profile viewer={viewer} favorites={data} orgs={organizations} />;
}
