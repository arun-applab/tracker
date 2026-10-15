import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { projectInput } from "@/lib/validation";
import { getProjectDetail, updateProject } from "@/server/services/projects";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    const d = await getProjectDetail(actor, id);
    return {
      project: { ...d.project, links: d.project.links },
      teams: d.teams,
      // Team hours only for the Head / the project's managers.
      perPerson: d.teamHours ? d.perPerson : undefined,
      teamTotals: d.teamHours ? d.teamTotals : undefined,
      total: d.teamHours ? d.total : undefined,
      myHours: d.myHours,
      logs: d.logs,
      overdue: d.overdue,
    };
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    return updateProject(actor, id, projectInput.parse(await readJson(req)));
  });
}
