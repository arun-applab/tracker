import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { userUpdate } from "@/lib/validation";
import { updateUser } from "@/server/services/users";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    return updateUser(actor, id, userUpdate.parse(await readJson(req)));
  });
}
