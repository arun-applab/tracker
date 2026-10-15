import { AppShell } from "@/components/app/app-shell";
import { db } from "@/lib/db";
import { requireActor } from "@/server/actor";
import { getLogFormOptions } from "@/server/form-options";
import { getMyAvailability } from "@/server/services/availability";
import { countUnreadSuggestions } from "@/server/services/suggestions";
import { listOpenThreads } from "@/server/services/timelogs";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();
  const [suggestions, me, logOptions, myStatus, threads] = await Promise.all([
    countUnreadSuggestions(actor),
    db.user.findUnique({
      where: { id: actor.id },
      select: { manager: { select: { name: true } }, skills: { select: { skill: { select: { name: true } } }, orderBy: { skill: { name: "asc" } } } },
    }),
    getLogFormOptions(actor),
    getMyAvailability(actor),
    listOpenThreads(actor),
  ]);
  return (
    <AppShell
      user={{
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
        teamLabel: me?.manager ? `${me.manager.name}'s team` : null,
        skills: me?.skills.map((s) => s.skill.name) ?? [],
      }}
      badges={{ suggestions }}
      logOptions={logOptions}
      myStatus={myStatus ? { status: myStatus.status, autoStatus: myStatus.autoStatus, overridden: myStatus.overridden } : null}
      threads={threads}
    >
      {children}
    </AppShell>
  );
}
