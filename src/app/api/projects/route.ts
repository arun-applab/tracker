import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { projectInput } from "@/lib/validation";
import { createProject, listProjects } from "@/server/services/projects";
import { PRIORITIES, PROJECT_STATUSES } from "@/lib/constants";
import type { Priority, ProjectStatus } from "@/generated/prisma/enums";

export async function GET(req: Request) {
  return handle(async () => {
    const actor = await apiActor();
    const sp = new URL(req.url).searchParams;
    const status = sp.get("status") as ProjectStatus | null;
    const priority = sp.get("priority") as Priority | null;
    return listProjects(actor, {
      q: sp.get("q") ?? undefined,
      status: status && PROJECT_STATUSES.includes(status) ? status : undefined,
      priority: priority && PRIORITIES.includes(priority) ? priority : undefined,
      managerId: sp.get("managerId") ?? undefined,
      sort: sp.get("sort") === "eta_desc" ? "eta_desc" : "eta_asc",
    });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const actor = await apiActor();
    return createProject(actor, projectInput.parse(await readJson(req)));
  }, 201);
}
