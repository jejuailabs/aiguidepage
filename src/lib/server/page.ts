import "server-only";
import { redirect } from "next/navigation";
import { getViewer } from "./session.ts";
export async function pageViewer(locale: string, next: string) {
  const viewer = await getViewer();
  if (!viewer)
    redirect(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}${next}`)}`,
    );
  return viewer;
}
