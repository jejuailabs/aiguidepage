import {publicItems} from '@/lib/server/portal';
import {getAiCategorySettings} from '@/lib/server/ai-categories';
import { result, failure } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    const [items,settings]=await Promise.all([publicItems(),getAiCategorySettings()]);
    return result({items,categories:settings.categories});
  } catch (error) {
    return failure(error);
  }
}
