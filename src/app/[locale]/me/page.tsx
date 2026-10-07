import { pageViewer } from "@/lib/server/page";
import { favorites } from "@/lib/server/portal";
import { Profile } from "@/components/portal/profile";
import { AccessNotice } from "@/components/portal/access-notice";
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params,
    viewer = await pageViewer(locale, "/me");
  let data;
  try {
    data = (await favorites(viewer)) as React.ComponentProps<
      typeof Profile
    >["favorites"];
  } catch {
    return <AccessNotice code="unavailable" />;
  }
  return <Profile viewer={viewer} favorites={data} />;
}
