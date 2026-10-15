import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { suggestionInput } from "@/lib/validation";
import { createSuggestion, listSuggestions } from "@/server/services/suggestions";

export async function GET() {
  return handle(async () => listSuggestions(await apiActor()));
}

export async function POST(req: Request) {
  return handle(async () => {
    const actor = await apiActor();
    return createSuggestion(actor, suggestionInput.parse(await readJson(req)));
  }, 201);
}
