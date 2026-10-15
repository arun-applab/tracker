import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { suggestionStatusInput } from "@/lib/validation";
import { getSuggestion, setSuggestionStatus } from "@/server/services/suggestions";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    const s = await getSuggestion(actor, id);
    // Never expose the author of an anonymous suggestion through the API.
    const { authorId: _a, author: _b, ...rest } = s;
    void _a;
    void _b;
    return rest;
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    const { status } = suggestionStatusInput.parse(await readJson(req));
    return setSuggestionStatus(actor, id, status);
  });
}
