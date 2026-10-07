import {publicItems} from '@/lib/server/portal';
import { result, failure } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return result({items:await publicItems()});
  } catch (error) {
    return failure(error);
  }
}
