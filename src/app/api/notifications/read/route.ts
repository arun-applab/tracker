import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { notificationReadInput } from "@/lib/validation";
import { markNotificationsRead } from "@/server/services/notifications";

export async function POST(req: Request) {
  return handle(async () => {
    const actor = await apiActor();
    const input = notificationReadInput.parse(await readJson(req));
    return markNotificationsRead(actor, "all" in input ? "all" : input.ids);
  });
}
