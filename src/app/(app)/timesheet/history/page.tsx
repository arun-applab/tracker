import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AutoSubmitForm } from "@/components/app/auto-submit-form";
import { LogTable } from "@/components/app/log-table";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { db } from "@/lib/db";
import { formatHours, isValidIso } from "@/lib/dates";
import { todayIso } from "@/lib/server-time";
import { requireActor } from "@/server/actor";
import { getLogFormOptions } from "@/server/form-options";
import { toLogRow } from "@/server/serializers";
import { listLogs } from "@/server/services/timelogs";

export const metadata = { title: "Timesheet history" };

type SP = Promise<{ from?: string; to?: string; project?: string }>;

export default async function TimesheetHistoryPage({ searchParams }: { searchParams: SP }) {
  const actor = await requireActor(["ASSOCIATE_DESIGNER", "MID_DESIGNER", "MANAGER"]);
  const sp = await searchParams;
  const filters = {
    from: sp.from && isValidIso(sp.from) ? sp.from : undefined,
    to: sp.to && isValidIso(sp.to) ? sp.to : undefined,
    projectId: sp.project || undefined,
    userId: actor.id, // only your own entries here
  };
  const [{ logs, total, hours }, options, projects] = await Promise.all([
    listLogs(actor, filters),
    getLogFormOptions(actor),
    db.project.findMany({ where: { timeLogs: { some: { userId: actor.id } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const today = todayIso();
  const filtered = !!(filters.from || filters.to || filters.projectId);

  return (
    <>
      <Link href="/timesheet" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> My Timesheet
      </Link>
      <PageHeader title="Timesheet history" description={`${total} ${total === 1 ? "entry" : "entries"} · ${formatHours(hours)}`} />
      <AutoSubmitForm className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        <label className="grid gap-1 text-xs text-muted-foreground">From<Input type="date" name="from" defaultValue={filters.from} className="lg:w-44" /></label>
        <label className="grid gap-1 text-xs text-muted-foreground">To<Input type="date" name="to" defaultValue={filters.to} className="lg:w-44" /></label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Project
          <NativeSelect name="project" defaultValue={filters.projectId ?? ""} className="lg:w-64">
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
        </label>
        {filtered && <Button variant="ghost" size="sm" asChild><Link href="/timesheet/history">Clear</Link></Button>}
      </AutoSubmitForm>
      <LogTable logs={logs.map((l) => toLogRow(actor, l, today))} currentUserId={actor.id} showPerson={false} editOptions={options} emptyTitle={filtered ? "No entries match these filters" : "You haven't logged any time yet"} />
      {total > logs.length && <p className="mt-3 text-xs text-muted-foreground">Showing the {logs.length} most recent of {total} entries — narrow the dates to see older ones.</p>}
    </>
  );
}
