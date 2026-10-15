import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { projectReviewInput } from "@/lib/validation";
import { reviewProject } from "@/server/services/projects";

/** Design Head: approve or decline a Design Manager's project request. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    const { decision, note } = projectReviewInput.parse(await readJson(req));
    return reviewProject(actor, id, decision, note);
  });
}
