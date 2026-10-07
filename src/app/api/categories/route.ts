import { getAiCategorySettings } from "@/lib/server/ai-categories";
import { result, failure } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return result(await getAiCategorySettings());
  } catch (error) {
    return failure(error);
  }
}
