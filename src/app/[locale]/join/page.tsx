import { getViewer } from "@/lib/server/session";
import { JoinForm } from "@/components/auth/join-form";
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  return (
    <JoinForm signedIn={!!viewer} initialCode={params.code?.slice(0, 30)} />
  );
}
