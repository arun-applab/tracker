import "server-only";
import type { z } from "zod";
import { db } from "@/lib/db";
import { forbidden, notFound } from "@/lib/errors";
import type { Prisma } from "@/generated/prisma/client";
import type { SuggestionCategory, SuggestionStatus } from "@/generated/prisma/enums";
import type { Actor } from "@/server/actor";
import { canSubmitSuggestion, isHead, isManager } from "@/server/permissions";
import type { suggestionInput } from "@/lib/validation";

function scope(actor: Actor): Prisma.SuggestionWhereInput {
  if (isHead(actor)) return {};
  if (isManager(actor)) return { authorId: actor.id };
  throw forbidden();
}

type Msg = { authorId: string; createdAt: Date };

/** Unread = something written by someone else after the viewer last opened the thread. */
function isUnread(actorId: string, s: Msg & { replies: Msg[]; reads: { lastReadAt: Date }[] }) {
  const fromOthers = [s, ...s.replies].filter((m) => m.authorId !== actorId);
  if (!fromOthers.length) return false;
  const latest = Math.max(...fromOthers.map((m) => m.createdAt.getTime()));
  const read = s.reads[0]?.lastReadAt.getTime() ?? 0;
  return latest > read;
}

export function displayAuthor(actor: Actor, s: { anonymous: boolean; authorId: string; author: { name: string } }) {
  if (s.authorId === actor.id) return s.anonymous ? "You (anonymous)" : "You";
  return s.anonymous ? "Anonymous" : s.author.name;
}

export async function listSuggestions(actor: Actor, f: { status?: SuggestionStatus; category?: SuggestionCategory } = {}) {
  const rows = await db.suggestion.findMany({
    where: { AND: [scope(actor), f.status ? { status: f.status } : {}, f.category ? { category: f.category } : {}] },
    orderBy: { lastActivityAt: "desc" },
    include: {
      author: { select: { name: true } },
      replies: { select: { authorId: true, createdAt: true } },
      reads: { where: { userId: actor.id }, select: { lastReadAt: true } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    category: s.category,
    status: s.status,
    anonymous: s.anonymous,
    author: displayAuthor(actor, s),
    createdAt: s.createdAt,
    lastActivityAt: s.lastActivityAt,
    replyCount: s.replies.length,
    unread: isUnread(actor.id, s),
    preview: s.message.slice(0, 160),
  }));
}

export async function countUnreadSuggestions(actor: Actor) {
  if (!isHead(actor) && !isManager(actor)) return 0;
  const rows = await db.suggestion.findMany({
    where: scope(actor),
    select: {
      authorId: true,
      createdAt: true,
      replies: { select: { authorId: true, createdAt: true } },
      reads: { where: { userId: actor.id }, select: { lastReadAt: true } },
    },
  });
  return rows.filter((s) => isUnread(actor.id, s)).length;
}

export async function getSuggestion(actor: Actor, id: string, markRead = true) {
  const s = await db.suggestion.findFirst({
    where: { AND: [{ id }, scope(actor)] },
    include: {
      author: { select: { name: true } },
      reads: { where: { userId: actor.id }, select: { lastReadAt: true } },
      replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true, role: true } } } },
    },
  });
  if (!s) throw notFound("Suggestion not found");
  const wasUnread = isUnread(actor.id, { ...s, replies: s.replies.map((r) => ({ authorId: r.author.id, createdAt: r.createdAt })) });
  if (markRead) {
    await db.suggestionRead.upsert({
      where: { userId_suggestionId: { userId: actor.id, suggestionId: id } },
      create: { userId: actor.id, suggestionId: id, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    });
  }
  const { reads: _reads, ...rest } = s;
  void _reads;
  return {
    ...rest,
    wasUnread,
    authorLabel: displayAuthor(actor, s),
    replies: s.replies.map((r) => ({
      id: r.id,
      message: r.message,
      createdAt: r.createdAt,
      mine: r.author.id === actor.id,
      authorLabel:
        r.author.id === actor.id
          ? "You"
          : r.author.id === s.authorId && s.anonymous
            ? "Anonymous (submitter)"
            : `${r.author.name}${r.author.role === "HEAD" ? " · Design Head" : ""}`,
    })),
    canReply: isHead(actor) || s.authorId === actor.id,
    canSetStatus: isHead(actor),
  };
}

export async function createSuggestion(actor: Actor, input: z.infer<typeof suggestionInput>) {
  if (!canSubmitSuggestion(actor)) throw forbidden("Only Design Managers can submit suggestions.");
  const now = new Date();
  return db.suggestion.create({
    data: {
      ...input,
      authorId: actor.id,
      createdAt: now,
      lastActivityAt: now,
      reads: { create: { userId: actor.id, lastReadAt: now } },
    },
    select: { id: true },
  });
}

export async function replyToSuggestion(actor: Actor, id: string, message: string) {
  const s = await db.suggestion.findUnique({ where: { id }, select: { authorId: true } });
  if (!s) throw notFound("Suggestion not found");
  if (!isHead(actor) && s.authorId !== actor.id) throw forbidden();
  const now = new Date();
  await db.$transaction([
    db.suggestionReply.create({ data: { suggestionId: id, authorId: actor.id, message, createdAt: now } }),
    db.suggestion.update({ where: { id }, data: { lastActivityAt: now } }),
    db.suggestionRead.upsert({
      where: { userId_suggestionId: { userId: actor.id, suggestionId: id } },
      create: { userId: actor.id, suggestionId: id, lastReadAt: now },
      update: { lastReadAt: now },
    }),
  ]);
  return { id };
}

export async function setSuggestionStatus(actor: Actor, id: string, status: SuggestionStatus) {
  if (!isHead(actor)) throw forbidden("Only the Design Head can change a suggestion's status.");
  const s = await db.suggestion.findUnique({ where: { id }, select: { id: true } });
  if (!s) throw notFound("Suggestion not found");
  await db.suggestion.update({ where: { id }, data: { status } });
  return { id };
}
