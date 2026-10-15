import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { linkInput } from "@/lib/validation";
import { addProjectLink } from "@/server/services/projects";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    return addProjectLink(actor, id, linkInput.parse(await readJson(req)));
  }, 201);
}
