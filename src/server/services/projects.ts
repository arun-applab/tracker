import "server-only";
import type { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { toDbDate, toIso } from "@/lib/dates";
import { todayIso } from "@/lib/server-time";
import type { Prisma } from "@/generated/prisma/client";
import type { Priority, ProjectStatus, Role } from "@/generated/prisma/enums";
import type { Actor } from "@/server/actor";
import {
  accessOf,
  canAddLink,
  canChangeStatus,
  canCreateProject,
  canDeleteLink,
  canEditProjectDetails,
  canOnboard,
  canSeeTeamHours,
  canViewProject,
  isHead,
  isManager,
  isProjectManager,
  type ProjectAccess,
} from "@/server/permissions";
import type { linkInput, projectInput } from "@/lib/validation";

export function isOverdue(p: { eta: Date; status: ProjectStatus }, today = todayIso()) {
  return toIso(p.eta) < today && p.status !== "COMPLETED" && p.status !== "CANCELLED";
}

/** Prisma filter for the projects an actor may see: Head all, everyone else only where assigned. */
export function projectScope(actor: Actor): Prisma.ProjectWhereInput {
  if (isHead(actor)) return {};
  if (isManager(actor)) return { OR: [{ managers: { some: { managerId: actor.id } } }, { assignments: { some: { userId: actor.id } } }] };
  return { assignments: { some: { userId: actor.id } } };
}

const accessSelect = {
  managers: { select: { managerId: true } },
  assignments: { select: { userId: true } },
} satisfies Prisma.ProjectSelect;

export async function loadAccess(projectId: string) {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { id: true, status: true, ...accessSelect } });
  if (!p) throw notFound("Project not found");
  return { ...p, access: accessOf(p) };
}

export type ProjectListFilters = {
  q?: string;
  status?: ProjectStatus;
  managerId?: string;
  priority?: Priority;
  sort?: "eta_asc" | "eta_desc";
};

export async function listProjects(actor: Actor, f: ProjectListFilters = {}) {
  const and: Prisma.ProjectWhereInput[] = [projectScope(actor)];
  if (f.q) and.push({ OR: [{ name: { contains: f.q, mode: "insensitive" } }, { client: { contains: f.q, mode: "insensitive" } }] });
  if (f.status) and.push({ status: f.status });
  if (f.managerId) and.push({ managers: { some: { managerId: f.managerId } } });
  if (f.priority) and.push({ priority: f.priority });

  const projects = await db.project.findMany({
    where: { AND: and },
    orderBy: [{ eta: f.sort === "eta_desc" ? "desc" : "asc" }, { name: "asc" }],
    include: {
      managers: { include: { manager: { select: { id: true, name: true } } }, orderBy: { assignedAt: "asc" } },
      assignments: { include: { user: { select: { id: true, name: true } } }, orderBy: { assignedAt: "asc" } },
      _count: { select: { links: true } },
    },
  });
  const ids = projects.map((p) => p.id);
  const [totals, mine] = await Promise.all([
    db.timeLog.groupBy({ by: ["projectId"], where: { projectId: { in: ids } }, _sum: { hours: true } }),
    db.timeLog.groupBy({ by: ["projectId"], where: { projectId: { in: ids }, userId: actor.id }, _sum: { hours: true } }),
  ]);
  const today = todayIso();
  return projects.map((p) => {
    const access = accessOf(p);
    const teamHours = canSeeTeamHours(actor, access);
    return {
      id: p.id,
      name: p.name,
      client: p.client,
      status: p.status,
      priority: p.priority,
      eta: toIso(p.eta),
      startDate: toIso(p.startDate),
      managers: p.managers.map((m) => m.manager),
      members: p.assignments.map((a) => a.user),
      linkCount: p._count.links,
      // Totals only for Head / the project's managers; everyone else sees their own hours.
      hours: teamHours ? (totals.find((t) => t.projectId === p.id)?._sum.hours ?? 0) : null,
      myHours: mine.find((t) => t.projectId === p.id)?._sum.hours ?? 0,
      overdue: isOverdue(p, today),
      iManage: isProjectManager(actor, access),
    };
  });
}

export async function getProjectOr404(actor: Actor, id: string) {
  const p = await loadAccess(id);
  if (!canViewProject(actor, p.access)) throw notFound("Project not found");
  return p;
}

export type DetailLogFilters = { from?: string; to?: string; userId?: string; role?: "MANAGER" | "ASSOCIATE_DESIGNER" | "TEAM_MEMBER" };

const personSelect = { id: true, name: true, role: true, jobTitle: true, isActive: true, managerId: true } satisfies Prisma.UserSelect;

export async function getProjectDetail(actor: Actor, id: string, f: DetailLogFilters = {}) {
  await getProjectOr404(actor, id);
  const project = await db.project.findUniqueOrThrow({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      managers: { orderBy: { assignedAt: "asc" }, include: { manager: { select: personSelect } } },
      assignments: { orderBy: { assignedAt: "asc" }, include: { user: { select: personSelect } } },
      statusChanges: { orderBy: { changedAt: "desc" }, include: { changedBy: { select: { name: true } } } },
      links: { orderBy: { createdAt: "desc" }, include: { addedBy: { select: { id: true, name: true } } } },
    },
  });
  const access = accessOf(project);
  const teamHours = canSeeTeamHours(actor, access);

  // Teams = one column per assigned manager. A person sits in the column of the manager who
  // onboarded them (borrowed if that isn't their home manager), else their home manager's column.
  const columnOf = (a: { assignedById: string; user: { managerId: string | null } }) =>
    access.managerIds.includes(a.assignedById) ? a.assignedById : a.user.managerId && access.managerIds.includes(a.user.managerId) ? a.user.managerId : null;
  const managerNames = await homeManagerNames(project.assignments.map((a) => a.user.managerId));
  const member = (a: (typeof project.assignments)[number]) => ({
    ...a.user,
    borrowed: columnOf(a) !== a.user.managerId,
    homeManagerName: a.user.managerId ? (managerNames.get(a.user.managerId) ?? null) : null,
  });
  const teams = project.managers.map((m) => ({
    manager: m.manager,
    members: project.assignments.filter((a) => columnOf(a) === m.managerId).map(member),
  }));
  const unteamed = project.assignments.filter((a) => columnOf(a) === null).map(member);

  let perPerson: { id: string; name: string; role: Role; jobTitle: string | null; teamManagerId: string | null; borrowed: boolean; homeManagerName: string | null; assigned: boolean; hours: number }[] = [];
  let teamTotals: { managerId: string; name: string; hours: number }[] = [];
  let total = 0;
  let borrowedHours = 0;
  if (teamHours) {
    const grouped = await db.timeLog.groupBy({ by: ["userId"], where: { projectId: id }, _sum: { hours: true } });
    const known = new Map<string, { id: string; name: string; role: Role; jobTitle: string | null; managerId: string | null }>();
    for (const m of project.managers) known.set(m.manager.id, m.manager);
    for (const a of project.assignments) known.set(a.user.id, a.user);
    const missing = grouped.map((g) => g.userId).filter((u) => !known.has(u));
    if (missing.length) for (const u of await db.user.findMany({ where: { id: { in: missing } }, select: personSelect })) known.set(u.id, u);
    const ids = [...new Set([...project.managers.map((m) => m.managerId), ...project.assignments.map((a) => a.userId), ...grouped.map((g) => g.userId)])];
    perPerson = ids.map((uid) => {
      const u = known.get(uid)!;
      const asg = project.assignments.find((a) => a.userId === uid);
      const teamManagerId = u.role === "MANAGER" ? u.id : asg ? columnOf(asg) : u.managerId;
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        jobTitle: u.jobTitle,
        teamManagerId,
        borrowed: u.role !== "MANAGER" && teamManagerId !== u.managerId,
        homeManagerName: u.managerId ? (managerNames.get(u.managerId) ?? null) : null,
        assigned: access.memberIds.includes(u.id) || access.managerIds.includes(u.id),
        hours: grouped.find((g) => g.userId === uid)?._sum.hours ?? 0,
      };
    });
    total = perPerson.reduce((s, p) => s + p.hours, 0);
    borrowedHours = perPerson.filter((p) => p.borrowed).reduce((s, p) => s + p.hours, 0);
    teamTotals = project.managers.map((m) => ({
      managerId: m.managerId,
      name: m.manager.name,
      hours: perPerson.filter((p) => p.teamManagerId === m.managerId).reduce((s, p) => s + p.hours, 0),
    }));
  }
  const myHours = (await db.timeLog.aggregate({ where: { projectId: id, userId: actor.id }, _sum: { hours: true } }))._sum.hours ?? 0;

  // Daily log table: everything for Head / project managers, otherwise only your own entries.
  const logWhere: Prisma.TimeLogWhereInput = { projectId: id };
  if (!teamHours) logWhere.userId = actor.id;
  else if (f.userId) logWhere.userId = f.userId;
  if (f.role) logWhere.user = { role: f.role };
  if (f.from || f.to) logWhere.date = { ...(f.from && { gte: toDbDate(f.from) }), ...(f.to && { lte: toDbDate(f.to) }) };
  const logs = await db.timeLog.findMany({ where: logWhere, include: logIncludeForProject, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 300 });

  return {
    project,
    access,
    teams,
    unteamed,
    teamHours,
    perPerson,
    teamTotals,
    total,
    ownHours: total - borrowedHours,
    borrowedHours,
    myHours,
    logs,
    overdue: isOverdue(project),
    can: {
      editDetails: canEditProjectDetails(actor),
      changeStatus: canChangeStatus(actor, access),
      onboard: canOnboard(actor, access),
      addLink: canAddLink(actor, access),
      deleteLink: (l: { addedById: string }) => canDeleteLink(actor, access, l),
    },
  };
}

async function homeManagerNames(ids: (string | null)[]) {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  const rows = unique.length ? await db.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } }) : [];
  return new Map(rows.map((r) => [r.id, r.name]));
}

// Shared include for logs (duplicated in timelogs.ts to avoid a cycle).
const logIncludeForProject = {
  user: { select: { id: true, name: true, role: true, managerId: true } },
  loggedBy: { select: { id: true, name: true } },
  project: { select: { id: true, name: true, managers: { select: { managerId: true } }, assignments: { select: { userId: true } } } },
  comments: { select: { authorId: true, createdAt: true }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.TimeLogInclude;

/** Active Design Managers the Head can assign. */
export async function listAssignableManagers() {
  return db.user.findMany({
    where: { role: "MANAGER", isActive: true },
    select: { id: true, name: true, jobTitle: true, _count: { select: { reports: { where: { isActive: true } } } } },
    orderBy: { name: "asc" },
  });
}

/**
 * People an actor may onboard: any active Associate Designer / Team Member from ANY team
 * (other teams = borrowing). `ownedBy` marks people already on the project via someone else,
 * who the actor can't remove.
 */
export async function getOnboardablePeople(actor: Actor, projectId: string, access: ProjectAccess) {
  if (!canOnboard(actor, access)) return [];
  const [users, current] = await Promise.all([
    db.user.findMany({
      where: { isActive: true, role: { in: ["ASSOCIATE_DESIGNER", "TEAM_MEMBER"] } },
      select: { id: true, name: true, role: true, jobTitle: true, manager: { select: { id: true, name: true } }, skills: { select: { skill: { select: { name: true } } } } },
      orderBy: { name: "asc" },
    }),
    db.projectAssignment.findMany({ where: { projectId }, select: { userId: true, assignedById: true, assignedBy: { select: { name: true } }, user: { select: { managerId: true } } } }),
  ]);
  return users
    .map((u) => {
      const asg = current.find((c) => c.userId === u.id);
      const mine = !asg || isHead(actor) || inActorSlice(actor, asg);
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        jobTitle: u.jobTitle,
        managerId: u.manager?.id ?? null,
        managerName: u.manager?.name ?? "",
        own: u.manager?.id === actor.id,
        skills: u.skills.map((s) => s.skill.name),
        lockedBy: mine ? null : asg!.assignedBy.name,
      };
    })
    .sort((a, b) => Number(b.own) - Number(a.own) || a.managerName.localeCompare(b.managerName) || a.name.localeCompare(b.name));
}

/** A manager "owns" an assignment if they made it, or it's someone from their own team. */
function inActorSlice(actor: Actor, a: { assignedById: string; user: { managerId: string | null } }) {
  return a.assignedById === actor.id || a.user.managerId === actor.id;
}

async function validateManagers(ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return unique;
  const n = await db.user.count({ where: { id: { in: unique }, role: "MANAGER", isActive: true } });
  if (n !== unique.length) throw badRequest("Only active Design Managers can be assigned to a project.");
  return unique;
}

type ProjectInput = z.infer<typeof projectInput>;

export async function createProject(actor: Actor, input: ProjectInput) {
  if (!canCreateProject(actor)) throw forbidden("Only the Design Head can create projects.");
  const managerIds = await validateManagers(input.managerIds);
  const status = input.status ?? "NOT_STARTED";
  return db.project.create({
    data: {
      name: input.name,
      client: input.client,
      description: input.description,
      startDate: toDbDate(input.startDate),
      eta: toDbDate(input.eta),
      priority: input.priority,
      status,
      createdById: actor.id,
      statusChanges: { create: { fromStatus: null, toStatus: status, changedById: actor.id } },
      managers: { create: managerIds.map((managerId) => ({ managerId, assignedById: actor.id })) },
    },
    select: { id: true },
  });
}

export async function updateProject(actor: Actor, id: string, input: ProjectInput) {
  if (!canEditProjectDetails(actor)) throw forbidden("Only the Design Head can edit project details.");
  const project = await db.project.findUnique({ where: { id }, include: { managers: true } });
  if (!project) throw notFound("Project not found");
  const managerIds = await validateManagers(input.managerIds);
  const removed = project.managers.map((m) => m.managerId).filter((m) => !managerIds.includes(m));
  const added = managerIds.filter((m) => !project.managers.some((x) => x.managerId === m));

  await db.$transaction(async (tx) => {
    await tx.project.update({
      where: { id },
      data: {
        name: input.name,
        client: input.client,
        description: input.description,
        startDate: toDbDate(input.startDate),
        eta: toDbDate(input.eta),
        priority: input.priority,
        ...(input.status && { status: input.status }),
      },
    });
    if (input.status && input.status !== project.status) {
      await tx.projectStatusChange.create({ data: { projectId: id, fromStatus: project.status, toStatus: input.status, changedById: actor.id } });
    }
    if (removed.length) {
      await tx.projectManager.deleteMany({ where: { projectId: id, managerId: { in: removed } } });
      // People they onboarded (own team or borrowed) leave with them, unless a remaining
      // manager onboarded them. Logged hours are kept.
      await tx.projectAssignment.deleteMany({
        where: {
          projectId: id,
          OR: [{ assignedById: { in: removed } }, { user: { managerId: { in: removed } }, assignedById: { notIn: managerIds } }],
        },
      });
    }
    for (const managerId of added) await tx.projectManager.create({ data: { projectId: id, managerId, assignedById: actor.id } });
  });
  return { id };
}

export async function changeProjectStatus(actor: Actor, id: string, status: ProjectStatus) {
  const p = await loadAccess(id);
  if (!canChangeStatus(actor, p.access)) throw forbidden("Only the Design Head or the project's managers can change the status.");
  if (p.status === status) return { id };
  await db.$transaction([
    db.project.update({ where: { id }, data: { status } }),
    db.projectStatusChange.create({ data: { projectId: id, fromStatus: p.status, toStatus: status, changedById: actor.id } }),
  ]);
  return { id };
}

/**
 * Onboard / offboard people. Managers can onboard anyone from any team (borrowing). A manager's
 * selection only touches their own slice: people they onboarded plus their own team members.
 * The Head's selection covers everyone on the project.
 */
export async function setProjectMembers(actor: Actor, id: string, memberIds: string[]) {
  const p = await loadAccess(id);
  if (!canOnboard(actor, p.access)) throw forbidden("Only the project's Design Managers can onboard people.");
  const wanted = [...new Set(memberIds)];
  if (wanted.length) {
    const ok = await db.user.count({ where: { id: { in: wanted }, isActive: true, role: { in: ["ASSOCIATE_DESIGNER", "TEAM_MEMBER"] } } });
    if (ok !== wanted.length) throw badRequest("Only active Associate Designers and Team Members can be onboarded.");
  }
  const current = await db.projectAssignment.findMany({ where: { projectId: id }, select: { userId: true, assignedById: true, user: { select: { managerId: true } } } });
  const mine = current.filter((c) => isHead(actor) || inActorSlice(actor, c)).map((c) => c.userId);
  const others = current.map((c) => c.userId).filter((u) => !mine.includes(u));
  const toRemove = mine.filter((u) => !wanted.includes(u));
  const toAdd = wanted.filter((u) => !mine.includes(u) && !others.includes(u)); // already on via someone else → leave as is
  await db.$transaction(async (tx) => {
    if (toRemove.length) await tx.projectAssignment.deleteMany({ where: { projectId: id, userId: { in: toRemove } } });
    for (const userId of toAdd) await tx.projectAssignment.create({ data: { projectId: id, userId, assignedById: actor.id } });
  });
  return { id, added: toAdd.length, removed: toRemove.length };
}

/** Where a manager's people are borrowed into projects onboarded by other managers (read-only view). */
export async function getLentOut(managerId: string) {
  const assignments = await db.projectAssignment.findMany({
    where: { user: { managerId }, assignedById: { not: managerId } },
    include: {
      user: { select: { id: true, name: true, role: true } },
      assignedBy: { select: { id: true, name: true, role: true } },
      project: { select: { id: true, name: true, status: true, eta: true } },
    },
    orderBy: { assignedAt: "desc" },
  });
  const lent = assignments.filter((a) => a.assignedBy.role === "MANAGER");
  const hours = lent.length
    ? await db.timeLog.groupBy({ by: ["userId", "projectId"], where: { OR: lent.map((a) => ({ userId: a.userId, projectId: a.projectId })) }, _sum: { hours: true } })
    : [];
  return lent.map((a) => ({
    user: a.user,
    borrowedBy: a.assignedBy,
    project: { ...a.project, eta: toIso(a.project.eta) },
    hours: hours.find((h) => h.userId === a.userId && h.projectId === a.projectId)?._sum.hours ?? 0,
  }));
}

/** Cross-team summary for the Design Head: who lent whom, and hours logged on borrowed work. */
export async function getBorrowingSummary(weekFrom: Date, weekTo: Date) {
  const assignments = await db.projectAssignment.findMany({
    where: { assignedBy: { role: "MANAGER" } },
    select: { userId: true, projectId: true, assignedById: true, assignedBy: { select: { name: true } }, user: { select: { managerId: true, manager: { select: { name: true } } } } },
  });
  const borrowed = assignments.filter((a) => a.user.managerId && a.user.managerId !== a.assignedById);
  if (!borrowed.length) return [];
  const logs = await db.timeLog.findMany({
    where: { OR: borrowed.map((a) => ({ userId: a.userId, projectId: a.projectId })) },
    select: { userId: true, projectId: true, hours: true, date: true },
  });
  const flows = new Map<string, { lender: string; borrower: string; people: Set<string>; hours: number; weekHours: number }>();
  for (const a of borrowed) {
    const key = `${a.user.managerId}->${a.assignedById}`;
    const f = flows.get(key) ?? { lender: a.user.manager?.name ?? "—", borrower: a.assignedBy.name, people: new Set(), hours: 0, weekHours: 0 };
    f.people.add(a.userId);
    for (const l of logs.filter((l) => l.userId === a.userId && l.projectId === a.projectId)) {
      f.hours += l.hours;
      if (l.date >= weekFrom && l.date <= weekTo) f.weekHours += l.hours;
    }
    flows.set(key, f);
  }
  return [...flows.values()].map((f) => ({ ...f, people: f.people.size })).sort((a, b) => b.hours - a.hours);
}

function titleFromFigmaUrl(url: string) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    // /design/:key/:name, /file/:key/:name, /proto/:key/:name, /board/:key/:name
    const name = parts[2] ? decodeURIComponent(parts[2]).replace(/-/g, " ") : "";
    const kind = parts[0] === "proto" ? "Prototype" : parts[0] === "board" ? "FigJam board" : "Figma file";
    return name ? `${name}` : kind;
  } catch {
    return "Figma file";
  }
}

export async function addProjectLink(actor: Actor, projectId: string, input: z.infer<typeof linkInput>) {
  const p = await loadAccess(projectId);
  if (!canAddLink(actor, p.access)) throw notFound("Project not found");
  return db.projectLink.create({
    data: { projectId, url: input.url, title: input.title || titleFromFigmaUrl(input.url), addedById: actor.id },
    select: { id: true },
  });
}

export async function deleteProjectLink(actor: Actor, projectId: string, linkId: string) {
  const p = await loadAccess(projectId);
  const link = await db.projectLink.findFirst({ where: { id: linkId, projectId } });
  if (!link || !canViewProject(actor, p.access)) throw notFound("Link not found");
  if (!canDeleteLink(actor, p.access, link)) throw forbidden("Only the person who added it, the project's managers or the Design Head can remove this link.");
  await db.projectLink.delete({ where: { id: linkId } });
  return { id: linkId };
}

