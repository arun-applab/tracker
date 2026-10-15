import { apiActor } from "@/server/actor";
import { handle } from "@/server/api";
import { listSkills } from "@/server/services/users";

export async function GET() {
  return handle(async () => {
    await apiActor();
    return listSkills();
  });
}
