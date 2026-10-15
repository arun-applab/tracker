import "server-only";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { toDbDate, weekDays, weekStart } from "@/lib/dates";
import { todayIso } from "@/lib/server-time";
import { ACTIVE_PROJECT_STATUSES, OCCUPYING_STATUSES } from "@/lib/constants";
import type { AvailabilityStatus, Role } from "@/generated/prisma/enums";
import type { Actor } from "@/server/actor";
import { canSetAvailability, canViewAvailability, isHead } from "@/server/permissions";

/**
 * Automatic status from active projects:
 *  - any In Progress / Under Review project → Occupied
 *  - only Not Started / On Hold projects   → Partially Available
 *  - none                                   → Available
 * Anyone can override their own status (their manager and the Head can too).
 */
export function autoAvailability(statuses: string[]): AvailabilityStatus {
  if (statuses.some((s) => (OCCUPYING_STATUSES as string[]).includes(s))) return "OCCUPIED";
  if (statuses.length) return "PARTIALLY_AVAILABLE";
  return "AVAILABLE";
}

export type AvailabilityPerson = {
  id: string;
  name: string;
  role: Role;
  jobTitle: string | null;
  skills: string[];
  status: AvailabilityStatus;
  autoStatus: AvailabilityStatus;
  overridden: boolean;
  setBy: string | null; // name of who set the manual status (null = automatic)
  activeProjects: { id: string; name: string; status: string; borrowedBy: string | null }[];
  hoursThisWeek: number;
  canSet: boolean;
};

export type AvailabilityTeam = { manager: AvailabilityPerson; people: AvailabilityPerson[] };

const userSelect = {
  id: true,
  name: true,
  role: true,
  jobTitle: true,
  managerId: true,
  availabilityOverride: true,
  availabilityOverrideBy: { select: { id: true, name: true } },
  skills: { select: { skill: { select: { name: true } } }, orderBy: { skill: { name: "asc" } } },
  assignments: {
    where: { project: { status: { in: ACTIVE_PROJECT_STATUSES } } },
    select: { assignedBy: { select: { id: true, name: true, role: true } }, project: { select: { id: true, name: true, status: true } } },
  },
  managedProjects: {
    where: { project: { status: { in: ACTIVE_PROJECT_STATUSES } } },
    select: { project: { select: { id: true, name: true, status: true } } },
  },
} as const;

type Row = {
  id: string;
  name: string;
  role: Role;
  jobTitle: string | null;
  managerId: string | null;
  availabilityOverride: AvailabilityStatus | null;
  availabilityOverrideBy: { id: string; name: string } | null;
  skills: { skill: { name: string } }[];
  assignments: { assignedBy: { id: string; name: string; role: string }; project: { id: string; name: string; status: string } }[];
  managedProjects: { project: { id: string; name: string; status: string } }[];
};

function toPerson(actor: Actor | null, u: Row, hours: Map<string, number>): AvailabilityPerson {
  const projects = [
    ...u.assignments.map((a) => ({
      ...a.project,
      // Borrowed: onboarded by a manager other than their own
      borrowedBy: a.assignedBy.role === "MANAGER" && a.assignedBy.id !== u.managerId ? a.assignedBy.name : null,
    })),
    ...u.managedProjects.map((m) => ({ ...m.project, borrowedBy: null })),
  ];
  const unique = [...new Map(projects.map((p) => [p.id, p])).values()];
  const autoStatus = autoAvailability(unique.map((p) => p.status));
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    jobTitle: u.jobTitle,
    skills: u.skills.map((s) => s.skill.name),
    autoStatus,
    status: u.availabilityOverride ?? autoStatus,
    overridden: !!u.availabilityOverride,
    setBy: u.availabilityOverride ? (u.availabilityOverrideBy?.id === u.id ? "self" : (u.availabilityOverrideBy?.name ?? null)) : null,
    activeProjects: unique,
    hoursThisWeek: hours.get(u.id) ?? 0,
    canSet: actor ? canSetAvailability(actor, u) : false,
  };
}

async function weekHours() {
  const days = weekDays(weekStart(todayIso()));
  const rows = await db.timeLog.groupBy({ by: ["userId"], where: { date: { gte: toDbDate(days[0]), lte: toDbDate(days[6]) } }, _sum: { hours: true } });
  return new Map(rows.map((h) => [h.userId, h._sum.hours ?? 0]));
}

export async function getAvailability(actor: Actor): Promise<AvailabilityTeam[]> {
  if (!canViewAvailability(actor)) throw forbidden();
  const managers = await db.user.findMany({
    where: { role: "MANAGER", isActive: true },
    orderBy: { name: "asc" },
    select: {
      ...userSelect,
      reports: { where: { isActive: true, role: { in: ["ASSOCIATE_DESIGNER", "TEAM_MEMBER"] } }, orderBy: [{ role: "asc" }, { name: "asc" }], select: userSelect },
    },
  });
  const hours = await weekHours();
  const ordered = [...managers].sort((a, b) => Number(b.id === actor.id) - Number(a.id === actor.id));
  return ordered.map((m) => ({ manager: toPerson(actor, m, hours), people: m.reports.map((u) => toPerson(actor, u, hours)) }));
}

/** The signed-in person's own status (for the quick status switch in the top bar). */
export async function getMyAvailability(actor: Actor) {
  if (isHead(actor)) return null;
  const u = await db.user.findUnique({ where: { id: actor.id }, select: userSelect });
  if (!u) return null;
  return toPerson(actor, u, await weekHours());
}

export async function setAvailability(actor: Actor, userId: string, override: AvailabilityStatus | null) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, managerId: true } });
  if (!user) throw notFound("Person not found");
  if (user.role === "HEAD") throw badRequest("Availability isn't tracked for the Design Head.");
  if (!canSetAvailability(actor, user)) throw forbidden("You can set your own status, or your team's if you're their Design Manager.");
  await db.user.update({
    where: { id: userId },
    data: { availabilityOverride: override, availabilityOverrideAt: override ? new Date() : null, availabilityOverrideById: override ? actor.id : null },
  });
  return { id: userId };
}
