import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { pushSubscriptionInput, pushUnsubscribeInput } from "@/lib/validation";
import { removePushSubscription, savePushSubscription } from "@/server/services/notifications";

/** Register this browser for push notifications. */
export async function POST(req: Request) {
  return handle(async () => savePushSubscription(await apiActor(), pushSubscriptionInput.parse(await readJson(req))), 201);
}

/** Stop push notifications on this browser. */
export async function DELETE(req: Request) {
  return handle(async () => {
    const actor = await apiActor();
    return removePushSubscription(actor, pushUnsubscribeInput.parse(await readJson(req)).endpoint);
  });
}
