import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { membersInput } from "@/lib/validation";
import { setProjectMembers } from "@/server/services/projects";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    const { memberIds } = membersInput.parse(await readJson(req));
    return setProjectMembers(actor, id, memberIds);
  });
}
