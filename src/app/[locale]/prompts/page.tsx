import { getPublicHall } from "@/lib/server/public-hall";
import { PublicHall } from "@/components/portal/public-hall";
export const dynamic = "force-dynamic";
export default async function PromptsPage() {
  return <PublicHall hall="prompts" items={await getPublicHall("prompts")} />;
}
