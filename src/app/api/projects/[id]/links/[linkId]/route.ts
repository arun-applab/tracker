import { apiActor } from "@/server/actor";
import { handle } from "@/server/api";
import { deleteProjectLink } from "@/server/services/projects";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  return handle(async () => {
    const actor = await apiActor();
    const { id, linkId } = await params;
    return deleteProjectLink(actor, id, linkId);
  });
}
