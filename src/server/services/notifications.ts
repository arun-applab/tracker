import "server-only";
import { db } from "@/lib/db";
import { badRequest } from "@/lib/errors";
import type { Actor } from "@/server/actor";

export async function listNotifications(actor: Actor, take = 40) {
  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true, actor: { select: { name: true } } },
    }),
    db.notification.count({ where: { userId: actor.id, readAt: null } }),
  ]);
  return {
    unread,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: !!n.readAt,
      createdAt: n.createdAt.toISOString(),
      actorName: n.actor?.name ?? null,
    })),
  };
}

export async function markNotificationsRead(actor: Actor, ids: string[] | "all") {
  await db.notification.updateMany({
    where: { userId: actor.id, readAt: null, ...(ids === "all" ? {} : { id: { in: ids } }) },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

export async function savePushSubscription(actor: Actor, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  if (!/^https:\/\//.test(sub.endpoint)) throw badRequest("Invalid push endpoint.");
  await db.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId: actor.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { userId: actor.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
  return { ok: true };
}

export async function removePushSubscription(actor: Actor, endpoint: string) {
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: actor.id } });
  return { ok: true };
}
