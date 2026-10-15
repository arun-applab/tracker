import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { userCreate } from "@/lib/validation";
import { createUser, listUsers } from "@/server/services/users";

export async function GET() {
  return handle(async () => listUsers(await apiActor()));
}

export async function POST(req: Request) {
  return handle(async () => {
    const actor = await apiActor();
    return createUser(actor, userCreate.parse(await readJson(req)));
  }, 201);
}
