import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { commentInput } from "@/lib/validation";
import { addLogComment, getLogThread } from "@/server/services/timelogs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    return getLogThread(actor, id);
  });
}

export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    const { message } = commentInput.parse(await readJson(req));
    return addLogComment(actor, id, message);
  }, 201);
}
