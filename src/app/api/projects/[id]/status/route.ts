import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { statusInput } from "@/lib/validation";
import { changeProjectStatus } from "@/server/services/projects";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    const { status } = statusInput.parse(await readJson(req));
    return changeProjectStatus(actor, id, status);
  });
}
