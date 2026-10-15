import { apiActor } from "@/server/actor";
import { handle } from "@/server/api";
import { getAvailability } from "@/server/services/availability";

export async function GET() {
  return handle(async () => getAvailability(await apiActor()));
}
