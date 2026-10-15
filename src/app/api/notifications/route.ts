import { apiActor } from "@/server/actor";
import { handle } from "@/server/api";
import { listNotifications } from "@/server/services/notifications";
import { listOpenThreads } from "@/server/services/timelogs";

export const dynamic = "force-dynamic";

/** Polled by the bell: latest notifications, unread count and comment threads waiting on you. */
export async function GET() {
  return handle(async () => {
    const actor = await apiActor();
    const [n, threads] = await Promise.all([listNotifications(actor), listOpenThreads(actor)]);
    return { ...n, threads };
  });
}
