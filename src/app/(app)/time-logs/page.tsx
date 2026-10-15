import Link from "next/link";
import { Plus } from "lucide-react";
import { AutoSubmitForm } from "@/components/app/auto-submit-form";
import { LogTable } from "@/components/app/log-table";
import { PageHeader } from "@/components/app/page-header";
import { TimeLogDialog } from "@/components/app/time-log-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ROLE_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { addDays, formatHours, isValidIso } from "@/lib/dates";
import { todayIso } from "@/lib/server-time";
import { requireActor } from "@/server/actor";
import { getLogFormOptions } from "@/server/form-options";
import { isHead } from "@/server/permissions";
import { projectScope } from "@/server/services/projects";
import { listLogs, logScope } from "@/server/services/timelogs";
import { toLogRow } from "@/server/serializers";

export const metadata = { title: "Time logs" };

type SP = Promise<{ from?: string; to?: string; project?: string; person?: string; role?: string }>;

export default async function TimeLogsPage({ searchParams }: { searchParams: SP }) {
  const actor = await requireActor(["HEAD", "MANAGER"]);
  const sp = await searchParams;
  const today = todayIso();
  const filters = {
    from: sp.from === "all" ? undefined : sp.from && isValidIso(sp.from) ? sp.from : addDays(today, -13),
    to: sp.to && isValidIso(sp.to) ? sp.to : undefined,
    projectId: sp.project || undefined,
    userId: sp.person || undefined,
    role: sp.role === "MANAGER" || sp.role === "ASSOCIATE_DESIGNER" || sp.role === "TEAM_MEMBER" ? sp.role : undefined,
  } as const;

  const [{ logs, total, hours }, options, projects, people] = await Promise.all([
    listLogs(actor, filters),
    getLogFormOptions(actor),
    db.project.findMany({ where: projectScope(actor), select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { timeLogs: { some: logScope(actor) } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const filtered = !!(sp.from || filters.to || filters.projectId || filters.userId || filters.role);

  return (
    <>
      <PageHeader
        title="Time logs"
        description={
          <>
            {isHead(actor) ? "Every entry across all teams." : "Entries on the projects you manage, plus your own."} {total} {total === 1 ? "entry" : "entries"} ·{" "}
            <span className="font-semibold text-foreground">{formatHours(hours)}</span>
          </>
        }
        actions={
          options && (
            <TimeLogDialog options={options}>
              <Button size="lg"><Plus />Add time</Button>
            </TimeLogDialog>
          )
        }
      />
      <AutoSubmitForm className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        <label className="grid gap-1 text-xs text-muted-foreground">From<Input type="date" name="from" defaultValue={filters.from} className="lg:w-44" /></label>
        <label className="grid gap-1 text-xs text-muted-foreground">To<Input type="date" name="to" defaultValue={filters.to} className="lg:w-44" /></label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Project
          <NativeSelect name="project" defaultValue={filters.projectId ?? ""} className="lg:w-60">
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Person
          <NativeSelect name="person" defaultValue={filters.userId ?? ""} className="lg:w-56">
            <option value="">Everyone</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Role
          <NativeSelect name="role" defaultValue={filters.role ?? ""} className="lg:w-52">
            <option value="">All roles</option>
            <option value="MANAGER">{ROLE_LABEL.MANAGER}</option>
            <option value="ASSOCIATE_DESIGNER">{ROLE_LABEL.ASSOCIATE_DESIGNER}</option>
            <option value="TEAM_MEMBER">{ROLE_LABEL.TEAM_MEMBER}</option>
          </NativeSelect>
        </label>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" asChild><Link href="/time-logs?from=all">All dates</Link></Button>
          {filtered && <Button variant="ghost" size="sm" asChild><Link href="/time-logs">Reset</Link></Button>}
        </div>
      </AutoSubmitForm>
      <LogTable logs={logs.map((l) => toLogRow(actor, l, today))} currentUserId={actor.id} editOptions={options} emptyTitle="No entries match these filters" />
      {total > logs.length && <p className="mt-3 text-xs text-muted-foreground">Showing the {logs.length} most recent of {total} entries — narrow the filters to see the rest.</p>}
    </>
  );
}
