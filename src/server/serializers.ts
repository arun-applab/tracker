import "server-only";
import { toIso } from "@/lib/dates";
import { todayIso } from "@/lib/server-time";
import type { Actor } from "@/server/actor";
import { accessOf, canCommentLog, canDeleteLog, canEditLog } from "@/server/permissions";
import type { LogWithRelations } from "@/server/services/timelogs";
import type { LogRow } from "@/components/app/log-types";

export function toLogRow(actor: Actor, l: LogWithRelations, today = todayIso()): LogRow {
  const ref = { userId: l.userId, date: l.date, project: accessOf(l.project) };
  const last = l.comments.at(-1);
  const participated = l.userId === actor.id || l.comments.some((c) => c.authorId === actor.id);
  return {
    id: l.id,
    date: toIso(l.date),
    hours: l.hours,
    description: l.description,
    taskType: l.taskType,
    user: { id: l.user.id, name: l.user.name, role: l.user.role },
    project: { id: l.project.id, name: l.project.name },
    loggedBy: { id: l.loggedBy.id, name: l.loggedBy.name },
    loggedBySelf: l.loggedById === l.userId,
    commentCount: l.comments.length,
    awaitingMe: !!last && last.authorId !== actor.id && participated,
    canEdit: canEditLog(actor, ref, today),
    canDelete: canDeleteLog(actor, ref, today),
    canComment: canCommentLog(actor, ref),
  };
}
