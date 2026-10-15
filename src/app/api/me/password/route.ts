import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { passwordChangeInput } from "@/lib/validation";
import { changeOwnPassword } from "@/server/services/users";

/** Change the signed-in user's own password. */
export async function POST(req: Request) {
  return handle(async () => {
    const actor = await apiActor();
    const { currentPassword, newPassword } = passwordChangeInput.parse(await readJson(req));
    return changeOwnPassword(actor, currentPassword, newPassword);
  });
}
