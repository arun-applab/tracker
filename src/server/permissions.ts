// Central role-based access rules (v2 workflow). Every API route and server page
// goes through these helpers, so the UI and the API can never disagree.
//
//  • Design Head creates projects and assigns one or more Design Managers.
//  • Design Managers can also create projects; those wait for the Head's approval.
//    Until approved, nobody can be onboarded and no time can be logged.
//  • Assigned managers onboard people from their own team or borrow from other teams.
//  • A project is visible only to the Head, its assigned managers and its members.
//  • Time entries have no approval step; questions go in a comment thread.

import type { ProjectApproval, ProjectStatus, Role } from "@/generated/prisma/enums";
import type { Actor } from "@/server/actor";
import { BACKDATE_LIMIT_DAYS } from "@/lib/constants";
import { diffDays, toIso } from "@/lib/dates";

export const isHead = (a: Pick<Actor, "role">) => a.role === "HEAD";
export const isManager = (a: Pick<Actor, "role">) => a.role === "MANAGER";
export const isDesignerRole = (role: Role) => role === "ASSOCIATE_DESIGNER" || role === "MID_DESIGNER";
export const isDesigner = (a: Pick<Actor, "role">) => isDesignerRole(a.role);
/** People who log their own time: designers and Design Managers (leads are working designers too). */
export const logsOwnTime = (a: Pick<Actor, "role">) => isDesigner(a) || isManager(a);

export type ProjectAccess = { managerIds: string[]; memberIds: string[] };

export function accessOf(p: { managers: { managerId: string }[]; assignments: { userId: string }[] }): ProjectAccess {
  return { managerIds: p.managers.map((m) => m.managerId), memberIds: p.assignments.map((a) => a.userId) };
}

export const isProjectManager = (a: Actor, p: ProjectAccess) => isManager(a) && p.managerIds.includes(a.id);
export const isProjectMember = (a: Actor, p: ProjectAccess) => p.memberIds.includes(a.id);

/** Head sees everything; everyone else only projects they're assigned to. */
export const canViewProject = (a: Actor, p: ProjectAccess) => isHead(a) || isProjectManager(a, p) || isProjectMember(a, p);

/** Project-level checks also need the approval state and who requested it. */
export type ProjectGate = ProjectAccess & { approval: ProjectApproval; createdById: string };
export const gateOf = (p: Parameters<typeof accessOf>[0] & { approval: ProjectApproval; createdById: string }): ProjectGate => ({
  ...accessOf(p),
  approval: p.approval,
  createdById: p.createdById,
});
export const isApproved = (p: { approval: ProjectApproval }) => p.approval === "APPROVED";

/** Head creates approved projects; a Design Manager's project is a request for the Head. */
export const canCreateProject = (a: Actor) => isHead(a) || isManager(a);
export const needsApproval = (a: Actor) => !isHead(a);
export const canReviewProject = (a: Actor) => isHead(a);

/**
 * Name, client, dates, priority and managers: the Head always; the requesting manager
 * while their request is pending or was rejected (editing a rejected request resubmits it).
 */
export const canEditProjectDetails = (a: Actor, p: ProjectGate) =>
  isHead(a) || (isManager(a) && p.createdById === a.id && !isApproved(p));

export const canChangeStatus = (a: Actor, p: ProjectGate) => isApproved(p) && (isHead(a) || isProjectManager(a, p));

/** Onboarding people (own team or borrowed from any other team): an assigned manager or the Head, once approved. */
export const canOnboard = (a: Actor, p: ProjectGate) => isApproved(p) && (isHead(a) || isProjectManager(a, p));

/** Per-person / per-team hours: Head and the project's managers only. */
export const canSeeTeamHours = (a: Actor, p: ProjectAccess) => isHead(a) || isProjectManager(a, p);

/** Figma links: anyone on the project (Head, managers, members) can add. */
export const canAddLink = (a: Actor, p: ProjectAccess) => canViewProject(a, p);
export const canDeleteLink = (a: Actor, p: ProjectAccess, link: { addedById: string }) =>
  link.addedById === a.id || isHead(a) || isProjectManager(a, p);

type LogRef = { userId: string; date: Date; project: ProjectAccess };

/** Owners can change their own entries for BACKDATE_LIMIT_DAYS; the project's managers can always. */
export function canEditLog(a: Actor, log: LogRef, today: string): boolean {
  if (isProjectManager(a, log.project)) return true;
  return log.userId === a.id && diffDays(today, toIso(log.date)) <= BACKDATE_LIMIT_DAYS;
}
export const canDeleteLog = canEditLog;

/** Who can read a single entry (and its thread). */
export const canViewLog = (a: Actor, log: LogRef) => isHead(a) || log.userId === a.id || isProjectManager(a, log.project);
export const canCommentLog = canViewLog;

/** Availability: the person themselves, their home manager, or the Head. */
export const canSetAvailability = (a: Actor, target: { id: string; role: Role; managerId: string | null }) =>
  a.id === target.id || isHead(a) || (isManager(a) && isDesignerRole(target.role) && target.managerId === a.id);

/** Head manages everyone; a manager manages the designers in their own team. */
export function canManageUser(a: Actor, target: { id: string; role: Role; managerId: string | null }): boolean {
  if (isHead(a)) return true;
  if (isManager(a)) return isDesignerRole(target.role) && target.managerId === a.id;
  return false;
}

export const canManageSkills = (a: Actor) => isHead(a);
export const canSubmitSuggestion = (a: Actor) => isManager(a);
export const canViewAvailability = (a: Actor) => isHead(a) || isManager(a);

export function isClosed(status: ProjectStatus) {
  return status === "COMPLETED" || status === "CANCELLED";
}
