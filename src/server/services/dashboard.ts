import "server-only";
import { db } from "@/lib/db";
import { addDays, toDbDate, toIso, weekDays, weekStart } from "@/lib/dates";
import { todayIso } from "@/lib/server-time";
import { ACTIVE_PROJECT_STATUSES, PROJECT_STATUSES } from "@/lib/constants";
import type { Actor } from "@/server/actor";
import { getAvailability } from "@/server/services/availability";
import { getBorrowingSummary, getLentOut, listProjects } from "@/server/services/projects";
import { countUnreadSuggestions } from "@/server/services/suggestions";
import { listOpenThreads } from "@/server/services/timelogs";

function thisWeek() {
  const today = todayIso();
  const days = weekDays(weekStart(today));
  return { today, from: toDbDate(days[0]), to: toDbDate(days[6]) };
}

export async function getHeadDashboard(actor: Actor) {
  const { today, from, to } = thisWeek();
  const [allProjects, managers, weekLogs, newSuggestions, unreadSuggestions, threads, borrowing] = await Promise.all([
    listProjects(actor, { sort: "eta_asc" }),
    db.user.findMany({
      where: { role: "MANAGER", isActive: true },
      select: { id: true, name: true, _count: { select: { reports: { where: { isActive: true } } } } },
      orderBy: { name: "asc" },
    }),
    db.timeLog.findMany({ where: { date: { gte: from, lte: to } }, select: { hours: true, userId: true, user: { select: { managerId: true } } } }),
    db.suggestion.count({ where: { status: "NEW" } }),
    countUnreadSuggestions(actor),
    listOpenThreads(actor, 5),
    getBorrowingSummary(from, to),
  ]);

  // Requests waiting for approval (or declined) don't count as department work yet.
  const projects = allProjects.filter((p) => p.approval === "APPROVED");
  const pendingRequests = allProjects.filter((p) => p.approval === "PENDING").sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const statusBreakdown = PROJECT_STATUSES.map((s) => ({ status: s, count: projects.filter((p) => p.status === s).length }));
  const overdue = projects.filter((p) => p.overdue);
  // A team = the manager + their reports.
  const utilization = managers.map((m) => ({
    managerId: m.id,
    team: m.name,
    members: m._count.reports + 1,
    hours: weekLogs.filter((h) => h.userId === m.id || h.user.managerId === m.id).reduce((s, h) => s + h.hours, 0),
  }));
  const active = projects.filter((p) => ACTIVE_PROJECT_STATUSES.includes(p.status));

  return {
    today,
    activeCount: active.length,
    totalProjects: projects.length,
    overdue,
    statusBreakdown,
    utilization,
    weekTotal: weekLogs.reduce((s, h) => s + h.hours, 0),
    newSuggestions,
    unreadSuggestions,
    unassigned: active.filter((p) => p.managers.length === 0),
    activeProjects: active.slice(0, 6),
    threads,
    borrowing,
    pendingRequests,
  };
}

export async function getManagerDashboard(actor: Actor) {
  const { today, from, to } = thisWeek();
  const nextWeek = addDays(today, 7);
  const [allMine, weekOnProjects, weekByTeam, myWeek, availability, threads, lentOut] = await Promise.all([
    listProjects(actor, { sort: "eta_asc" }),
    db.timeLog.aggregate({ where: { project: { managers: { some: { managerId: actor.id } } }, date: { gte: from, lte: to } }, _sum: { hours: true } }),
    db.timeLog.aggregate({ where: { OR: [{ userId: actor.id }, { user: { managerId: actor.id } }], date: { gte: from, lte: to } }, _sum: { hours: true } }),
    db.timeLog.aggregate({ where: { userId: actor.id, date: { gte: from, lte: to } }, _sum: { hours: true } }),
    getAvailability(actor),
    listOpenThreads(actor, 6),
    getLentOut(actor.id),
  ]);
  const projects = allMine.filter((p) => p.iManage && p.approval === "APPROVED");
  const myRequests = allMine.filter((p) => p.approval !== "APPROVED" && p.createdBy.id === actor.id);
  const myTeam = availability.find((t) => t.manager.id === actor.id);
  return {
    today,
    statusBreakdown: PROJECT_STATUSES.map((s) => ({ status: s, count: projects.filter((p) => p.status === s).length })),
    projects: projects.filter((p) => ACTIVE_PROJECT_STATUSES.includes(p.status)),
    projectCount: projects.length,
    hoursOnMyProjects: weekOnProjects._sum.hours ?? 0,
    hoursByMyTeam: weekByTeam._sum.hours ?? 0,
    myWeekHours: myWeek._sum.hours ?? 0,
    team: myTeam ? [myTeam.manager, ...myTeam.people] : [],
    dueSoon: projects.filter((p) => !["COMPLETED", "CANCELLED"].includes(p.status) && p.eta >= today && p.eta <= nextWeek),
    overdue: projects.filter((p) => p.overdue),
    threads,
    lentOut,
    myRequests,
  };
}

export async function getDesignerDashboard(actor: Actor) {
  const { today, from, to } = thisWeek();
  const [projects, todayHours, weekHours, threads, recent] = await Promise.all([
    listProjects(actor, { sort: "eta_asc" }),
    db.timeLog.aggregate({ where: { userId: actor.id, date: toDbDate(today) }, _sum: { hours: true } }),
    db.timeLog.aggregate({ where: { userId: actor.id, date: { gte: from, lte: to } }, _sum: { hours: true } }),
    listOpenThreads(actor, 6),
    db.timeLog.findMany({ where: { userId: actor.id }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 5, include: { project: { select: { id: true, name: true } } } }),
  ]);
  return {
    today,
    projects,
    todayHours: todayHours._sum.hours ?? 0,
    weekHours: weekHours._sum.hours ?? 0,
    threads,
    recent: recent.map((r) => ({ id: r.id, date: toIso(r.date), hours: r.hours, description: r.description, project: r.project })),
  };
}

