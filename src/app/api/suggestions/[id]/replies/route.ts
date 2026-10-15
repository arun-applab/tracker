import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { replyInput } from "@/lib/validation";
import { replyToSuggestion } from "@/server/services/suggestions";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    const { message } = replyInput.parse(await readJson(req));
    return replyToSuggestion(actor, id, message);
  }, 201);
}
