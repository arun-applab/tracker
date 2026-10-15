import "server-only";
import { addDays } from "@/lib/dates";
import { BACKDATE_LIMIT_DAYS } from "@/lib/constants";
import { todayIso } from "@/lib/server-time";
import type { LogFormOptions } from "@/components/app/log-types";
import type { Actor } from "@/server/actor";
import { isDesigner, isManager } from "@/server/permissions";
import { getLoggableProjects, getManagerLoggingOptions } from "@/server/services/timelogs";

/** Options for the add/edit time dialog, or undefined if the actor can't log time. */
export async function getLogFormOptions(actor: Actor): Promise<LogFormOptions | undefined> {
  const today = todayIso();
  const minDate = addDays(today, -BACKDATE_LIMIT_DAYS);
  if (isDesigner(actor)) {
    const projects = await getLoggableProjects(actor);
    return { mode: "self", projects: projects.map((p) => ({ id: p.id, name: p.name })), today, minDate };
  }
  if (isManager(actor)) {
    const [own, managed] = await Promise.all([getLoggableProjects(actor), getManagerLoggingOptions(actor)]);
    return { mode: "manager", ownProjects: own.map((p) => ({ id: p.id, name: p.name })), projects: managed, today, minDate };
  }
  return undefined;
}
