import { apiActor } from "@/server/actor";
import { handle, readJson } from "@/server/api";
import { logFilters, timeLogInput } from "@/lib/validation";
import { createLog, listLogs } from "@/server/services/timelogs";

export async function GET(req: Request) {
  return handle(async () => {
    const actor = await apiActor();
    const sp = Object.fromEntries([...new URL(req.url).searchParams].filter(([, v]) => v !== ""));
    return listLogs(actor, logFilters.parse(sp));
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const actor = await apiActor();
    return createLog(actor, timeLogInput.parse(await readJson(req)));
  }, 201);
}
