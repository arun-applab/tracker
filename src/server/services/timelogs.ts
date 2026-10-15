import "server-only";
import type { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { addDays, diffDays, formatDate, toDbDate, toIso, weekDays, weekStart } from "@/lib/dates";
import { todayIso } from "@/lib/server-time";
import { BACKDATE_LIMIT_DAYS, MAX_HOURS_PER_DAY } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";
import type { Actor } from "@/server/actor";
import {
  accessOf,
  canCommentLog,
  canDeleteLog,
  canEditLog,
  canViewLog,
  isClosed,
  isDesignerRole,
  isHead,
  isManager,
  isProjectManager,
  logsOwnTime,
} from "@/server/permissions";
import type { logFilters, timeLogInput, timeLogUpdate } from "@/lib/validation";

export const logInclude = {
  user: { select: { id: true, name: true, role: true, managerId: true } },
  loggedBy: { select: { id: true, name: true } },
  project: { select: { id: true, name: true, managers: { select: { managerId: true } }, assignments: { select: { userId: true } } } },
  comments: { select: { authorId: true, createdAt: true }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.TimeLogInclude;

export type LogWithRelations = Prisma.TimeLogGetPayload<{ include: typeof logInclude }>;

/** Logs an actor may see: Head all; managers their own + everything on projects they manage; designers their own. */
export function logScope(actor: Actor): Prisma.TimeLogWhereInput {
  if (isHead(actor)) return {};
  if (isManager(actor)) return { OR: [{ userId: actor.id }, { project: { managers: { some: { managerId: actor.id } } } }] };
  return { userId: actor.id };
}

function checkDate(date: string, opts: { allowOldDates: boolean }) {
  const today = todayIso();
  if (date > today) throw badRequest("You can't log time for a future date.");
  if (!opts.allowOldDates && diffDays(today, date) > BACKDATE_LIMIT_DAYS) {
    throw badRequest(`Entries can only be added up to ${BACKDATE_LIMIT_DAYS} days back (earliest: ${formatDate(addDays(today, -BACKDATE_LIMIT_DAYS))}).`);
  }
}

async function checkDailyCap(userId: string, date: string, hours: number, excludeId?: string) {
  const agg = await db.timeLog.aggregate({
    where: { userId, date: toDbDate(date), ...(excludeId && { id: { not: excludeId } }) },
    _sum: { hours: true },
  });
  const existing = agg._sum.hours ?? 0;
  if (existing + hours > MAX_HOURS_PER_DAY) {
    throw badRequest(
      `That would make ${existing + hours}h on ${formatDate(date)}. The limit is ${MAX_HOURS_PER_DAY}h per person per day across all projects (${existing}h already logged).`,
    );
  }
}

async function loadProject(projectId: string) {
  const p = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, status: true, managers: { select: { managerId: true } }, assignments: { select: { userId: true } } },
  });
  if (!p) throw notFound("Project not found");
  return { ...p, access: accessOf(p) };
}

/** Can `userId` log their own time on this project? Members, or managers assigned to it. */
function canSelfLogOn(user: { id: string; role: string }, p: { access: ReturnType<typeof accessOf> }) {
  return p.access.memberIds.includes(user.id) || (user.role === "MANAGER" && p.access.managerIds.includes(user.id));
}

export async function createLog(actor: Actor, input: z.infer<typeof timeLogInput>) {
  const targetId = input.userId ?? actor.id;
  const self = targetId === actor.id;
  const project = await loadProject(input.projectId);

  if (self) {
    if (!logsOwnTime(actor)) throw forbidden("The Design Head doesn't log time.");
    if (!canSelfLogOn(actor, project)) throw badRequest("You aren't assigned to this project.");
    if (isClosed(project.status)) throw badRequest("This project is closed for time logging.");
  } else {
    if (!isProjectManager(actor, project.access)) throw forbidden("You can only log time for others on projects you manage.");
    const target = await db.user.findUnique({ where: { id: targetId }, select: { id: true, role: true, isActive: true, managerId: true } });
    if (!target || !target.isActive || !isDesignerRole(target.role)) throw badRequest("Time can only be logged for active team members.");
    if (!project.access.memberIds.includes(target.id)) throw badRequest("That person isn't onboarded to this project.");
    if (target.managerId !== actor.id) {
      // Borrowed people: only the manager who onboarded them logs on their behalf.
      const asg = await db.projectAssignment.findUnique({ where: { projectId_userId: { projectId: project.id, userId: target.id } }, select: { assignedById: true } });
      if (asg?.assignedById !== actor.id) throw forbidden("You can only log time for your own team or people you borrowed onto this project.");
    }
  }

  checkDate(input.date, { allowOldDates: !self && !!input.overrideBackdate });
  await checkDailyCap(targetId, input.date, input.hours);

  return db.timeLog.create({
    data: {
      userId: targetId,
      projectId: project.id,
      date: toDbDate(input.date),
      hours: input.hours,
      description: input.description,
      taskType: input.taskType,
      loggedById: actor.id,
    },
    select: { id: true },
  });
}

async function loadLog(id: string) {
  const log = await db.timeLog.findUnique({
    where: { id },
    include: { project: { select: { managers: { select: { managerId: true } }, assignments: { select: { userId: true } } } } },
  });
  if (!log) throw notFound("Time entry not found");
  return { ...log, project: accessOf(log.project) };
}

export async function updateLog(actor: Actor, id: string, input: z.infer<typeof timeLogUpdate>) {
  const log = await loadLog(id);
  const today = todayIso();
  if (!canViewLog(actor, log)) throw notFound("Time entry not found");
  if (!canEditLog(actor, log, today)) throw forbidden(`Entries can only be edited within ${BACKDATE_LIMIT_DAYS} days. Ask your Design Manager to change older ones.`);
  const managerEdit = isProjectManager(actor, log.project);

  if (input.projectId !== log.projectId) {
    const project = await loadProject(input.projectId);
    const owner = await db.user.findUniqueOrThrow({ where: { id: log.userId }, select: { id: true, role: true } });
    if (!canSelfLogOn(owner, project)) throw badRequest("That person isn't on that project.");
    if (managerEdit ? !isProjectManager(actor, project.access) : isClosed(project.status)) throw badRequest("You can't move this entry to that project.");
  }
  if (input.date !== toIso(log.date)) checkDate(input.date, { allowOldDates: managerEdit && !!input.overrideBackdate });
  else if (input.date > today) throw badRequest("You can't log time for a future date.");
  await checkDailyCap(log.userId, input.date, input.hours, log.id);

  await db.timeLog.update({
    where: { id },
    data: { projectId: input.projectId, date: toDbDate(input.date), hours: input.hours, description: input.description, taskType: input.taskType },
  });
  return { id };
}

export async function deleteLog(actor: Actor, id: string) {
  const log = await loadLog(id);
  if (!canViewLog(actor, log)) throw notFound("Time entry not found");
  if (!canDeleteLog(actor, log, todayIso())) throw forbidden(`Entries can only be deleted within ${BACKDATE_LIMIT_DAYS} days.`);
  await db.timeLog.delete({ where: { id } });
  return { id };
}

// ─── Comment threads ────────────────────────────────────────────────────────

export async function getLogThread(actor: Actor, id: string) {
  const log = await db.timeLog.findUnique({
    where: { id },
    include: {
      ...logInclude,
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true, role: true } } } },
    },
  });
  if (!log) throw notFound("Time entry not found");
  const access = accessOf(log.project);
  if (!canViewLog(actor, { ...log, project: access })) throw notFound("Time entry not found");
  return {
    id: log.id,
    date: toIso(log.date),
    hours: log.hours,
    description: log.description,
    taskType: log.taskType,
    user: { id: log.user.id, name: log.user.name },
    project: { id: log.project.id, name: log.project.name },
    loggedBy: log.loggedBy.name,
    canComment: canCommentLog(actor, { ...log, project: access }),
    comments: log.comments.map((c) => ({ id: c.id, message: c.message, createdAt: c.createdAt.toISOString(), author: c.author, mine: c.author.id === actor.id })),
  };
}

export async function addLogComment(actor: Actor, id: string, message: string) {
  const log = await loadLog(id);
  if (!canViewLog(actor, log)) throw notFound("Time entry not found");
  if (!canCommentLog(actor, log)) throw forbidden();
  await db.timeLogComment.create({ data: { timeLogId: id, authorId: actor.id, message } });
  return { id };
}

/**
 * Threads waiting on the actor: their own entries where someone else spoke last,
 * or threads they've taken part in where someone else replied after them.
 */
export async function listOpenThreads(actor: Actor, take = 20) {
  const logs = await db.timeLog.findMany({
    where: { AND: [logScope(actor), { comments: { some: {} } }] },
    include: {
      user: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      comments: { orderBy: { createdAt: "asc" }, select: { authorId: true, createdAt: true, message: true, author: { select: { name: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  return logs
    .filter((l) => {
      const last = l.comments.at(-1)!;
      if (last.authorId === actor.id) return false;
      return l.userId === actor.id || l.comments.some((c) => c.authorId === actor.id);
    })
    .sort((a, b) => b.comments.at(-1)!.createdAt.getTime() - a.comments.at(-1)!.createdAt.getTime())
    .slice(0, take)
    .map((l) => {
      const last = l.comments.at(-1)!;
      return {
        id: l.id,
        date: toIso(l.date),
        hours: l.hours,
        user: l.user,
        project: l.project,
        lastMessage: last.message,
        lastAuthor: last.author.name,
        lastAt: last.createdAt.toISOString(),
      };
    });
}

// ─── Listing ────────────────────────────────────────────────────────────────

export async function listLogs(actor: Actor, f: z.infer<typeof logFilters>, take = 300) {
  const and: Prisma.TimeLogWhereInput[] = [logScope(actor)];
  if (f.from) and.push({ date: { gte: toDbDate(f.from) } });
  if (f.to) and.push({ date: { lte: toDbDate(f.to) } });
  if (f.projectId) and.push({ projectId: f.projectId });
  if (f.userId) and.push({ userId: f.userId });
  if (f.role) and.push({ user: { role: f.role } });
  const where = { AND: and };
  const [logs, total, sum] = await Promise.all([
    db.timeLog.findMany({ where, include: logInclude, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take }),
    db.timeLog.count({ where }),
    db.timeLog.aggregate({ where, _sum: { hours: true } }),
  ]);
  return { logs, total, hours: sum._sum.hours ?? 0 };
}

/** Open projects the actor can log their own time on. */
export async function getLoggableProjects(actor: Actor) {
  if (!logsOwnTime(actor)) return [];
  return db.project.findMany({
    where: {
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      OR: [{ assignments: { some: { userId: actor.id } } }, ...(isManager(actor) ? [{ managers: { some: { managerId: actor.id } } }] : [])],
    },
    select: { id: true, name: true, client: true, status: true },
    orderBy: { name: "asc" },
  });
}

/** Week grid data for "My Timesheet". */
export async function getTimesheetWeek(actor: Actor, anyDayInWeek: string) {
  const monday = weekStart(anyDayInWeek);
  const days = weekDays(monday);
  const logs = await db.timeLog.findMany({
    where: { userId: actor.id, date: { gte: toDbDate(days[0]), lte: toDbDate(days[6]) } },
    include: logInclude,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  const loggable = await getLoggableProjects(actor);
  const rowMap = new Map<string, { id: string; name: string; loggable: boolean }>();
  for (const p of loggable) rowMap.set(p.id, { id: p.id, name: p.name, loggable: true });
  for (const l of logs) if (!rowMap.has(l.projectId)) rowMap.set(l.projectId, { id: l.projectId, name: l.project.name, loggable: false });
  return { monday, days, logs, rows: [...rowMap.values()].sort((a, b) => a.name.localeCompare(b.name)), loggable };
}

/** Projects + own-team people a manager can log time for. */
export async function getManagerLoggingOptions(actor: Actor) {
  if (!isManager(actor)) return [];
  const projects = await db.project.findMany({
    where: { managers: { some: { managerId: actor.id } } },
    select: {
      id: true,
      name: true,
      status: true,
      assignments: {
        where: { user: { isActive: true }, OR: [{ user: { managerId: actor.id } }, { assignedById: actor.id }] },
        select: { user: { select: { id: true, name: true, managerId: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    closed: isClosed(p.status),
    people: p.assignments
      .map((a) => ({ id: a.user.id, name: a.user.managerId === actor.id ? a.user.name : `${a.user.name} (borrowed)` }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

