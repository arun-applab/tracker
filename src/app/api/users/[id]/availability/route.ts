import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { availabilityInput } from "@/lib/validation";
import { setAvailability } from "@/server/services/availability";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    const { override } = availabilityInput.parse(await readJson(req));
    return setAvailability(actor, id, override);
  });
}
