import { apiActor } from "@/server/actor";
import { handle } from "@/server/api";
import { listOpenThreads } from "@/server/services/timelogs";

/** Time-entry threads waiting on the signed-in user. */
export async function GET() {
  return handle(async () => listOpenThreads(await apiActor()));
}
