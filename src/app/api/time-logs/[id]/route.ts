import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { timeLogUpdate } from "@/lib/validation";
import { deleteLog, updateLog } from "@/server/services/timelogs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    return updateLog(actor, id, timeLogUpdate.parse(await readJson(req)));
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    return deleteLog(actor, id);
  });
}
