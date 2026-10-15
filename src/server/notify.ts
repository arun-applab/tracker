import "server-only";
import { db } from "@/lib/db";
import { sendPush } from "@/server/push";

export type NotificationType =
  | "project_request"
  | "project_resubmitted"
  | "project_approved"
  | "project_rejected"
  | "project_assigned"
  | "project_status"
  | "onboarded"
  | "offboarded"
  | "borrowed"
  | "time_logged_for_you"
  | "comment"
  | "availability"
  | "suggestion"
  | "suggestion_reply"
  | "suggestion_status";

type Input = { type: NotificationType; title: string; body: string; link?: string | null; actorId?: string | null };

/**
 * Creates an in-app notification for each recipient (never the actor themselves) and sends a
 * browser push to anyone who turned it on. Failures here never break the action that caused them.
 */
export async function notify(recipients: (string | null | undefined)[], n: Input) {
  try {
    const ids = [...new Set(recipients.filter((r): r is string => !!r && r !== n.actorId))];
    if (!ids.length) return;
    const active = await db.user.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } });
    const to = active.map((u) => u.id);
    if (!to.length) return;
    await db.notification.createMany({
      data: to.map((userId) => ({ userId, type: n.type, title: n.title, body: n.body, link: n.link ?? null, actorId: n.actorId ?? null })),
    });
    void sendPush(to, { title: n.title, body: n.body, link: n.link, tag: n.type }).catch((err) => console.error("Push error", err));
  } catch (err) {
    console.error("Notification failed", err);
  }
}

/** Active Design Heads (normally one). */
export async function headIds() {
  const heads = await db.user.findMany({ where: { role: "HEAD", isActive: true }, select: { id: true } });
  return heads.map((h) => h.id);
}

export const firstName = (name: string) => name.split(" ")[0];
