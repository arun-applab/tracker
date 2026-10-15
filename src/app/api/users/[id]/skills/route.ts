import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { skillsInput } from "@/lib/validation";
import { setUserSkills } from "@/server/services/users";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await apiActor();
    const { id } = await params;
    const { skills } = skillsInput.parse(await readJson(req));
    return setUserSkills(actor, id, skills);
  });
}
