import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";

// Browser push (Web Push / VAPID). Turned on by setting VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
// (generate them once with `npx web-push generate-vapid-keys`). Without them the in-app bell
// still works; only the desktop / phone pop-ups are off.

let configured: boolean | null = null;

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function ready() {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:design@applab.qa", pub, priv);
    configured = true;
  } catch (err) {
    console.error("Web push disabled: invalid VAPID keys", err);
    configured = false;
  }
  return configured;
}

export type PushPayload = { title: string; body: string; link?: string | null; tag?: string };

/** Sends to every registered browser of these users. Expired subscriptions are cleaned up. */
export async function sendPush(userIds: string[], payload: PushPayload) {
  if (!userIds.length || !ready()) return;
  const subs = await db.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  const body = JSON.stringify(payload);
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24 });
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        else console.error("Push failed", code ?? err);
      }
    }),
  );
}
