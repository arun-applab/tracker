import Link from "next/link";
import { ChevronLeft, ChevronRight, History, MessageCircle, Plus } from "lucide-react";
import { PageHeader, PanelHeader } from "@/components/app/page-header";
import { LogTable } from "@/components/app/log-table";
import { TimeLogDialog } from "@/components/app/time-log-dialog";
import type { LogRow } from "@/components/app/log-types";
import { Button } from "@/components/ui/button";
import { MAX_HOURS_PER_DAY } from "@/lib/constants";
import { addDays, formatDow, formatHours, formatShortDate, isValidIso, weekStart } from "@/lib/dates";
import { todayIso } from "@/lib/server-time";
import { cn, sum } from "@/lib/utils";
import { requireActor } from "@/server/actor";
import { getLogFormOptions } from "@/server/form-options";
import { toLogRow } from "@/server/serializers";
import { getTimesheetWeek } from "@/server/services/timelogs";

export const metadata = { title: "My Timesheet" };

function EntryChip({ log }: { log: LogRow }) {
  return (
    <span
      className={cn(
        "flex w-full items-center justify-between gap-1 rounded-xl px-2 py-1.5 text-left text-xs transition",
        log.awaitingMe ? "bg-[#fde2e1] text-[#8f2c2c]" : "bg-brand-soft text-[#2c438f]",
        log.canEdit && "cursor-pointer hover:brightness-95",
      )}
      title={`${log.description}${log.commentCount ? ` — ${log.commentCount} comment(s)` : ""}`}
    >
      <span className="font-semibold tabular">{formatHours(log.hours)}</span>
      {log.commentCount > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[10px]">
          <MessageCircle className="size-3" />
          {log.commentCount}
        </span>
      )}
    </span>
  );
}

export default async function TimesheetPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const actor = await requireActor(["ASSOCIATE_DESIGNER", "TEAM_MEMBER", "MANAGER"]);
  const { week } = await searchParams;
  const today = todayIso();
  const anchor = week && isValidIso(week) ? week : today;
  const [data, options] = await Promise.all([getTimesheetWeek(actor, anchor), getLogFormOptions(actor)]);
  const opts = options!;
  const rows = data.logs.map((l) => toLogRow(actor, l, today));
  const isThisWeek = data.monday === weekStart(today);

  const cellLogs = (projectId: string, day: string) => rows.filter((r) => r.project.id === projectId && r.date === day);
  const dayTotal = (day: string) => sum(rows.filter((r) => r.date === day).map((r) => r.hours));
  const weekTotal = sum(rows.map((r) => r.hours));
  const canAddOn = (day: string) => day <= today && day >= opts.minDate;

  return (
    <>
      <PageHeader
        title="My Timesheet"
        description="Your own hours only. Entries can be edited or deleted for 7 days."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/timesheet/history"><History />History</Link>
            </Button>
            <TimeLogDialog options={opts} defaults={{ date: canAddOn(today) ? today : undefined }}>
              <Button size="lg"><Plus />Add time</Button>
            </TimeLogDialog>
          </>
        }
      />

      <section className="panel mb-6 pb-5">
        <div className="flex flex-wrap items-center gap-3 px-6 pt-6">
          <div className="flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-sm">
            <Link href={`/timesheet?week=${addDays(data.monday, -7)}`} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-surface-muted" aria-label="Previous week">
              <ChevronLeft className="size-4" />
            </Link>
            <span className="px-2 text-sm font-medium tabular">
              {formatShortDate(data.days[0])} – {formatShortDate(data.days[6])}
            </span>
            <Link href={`/timesheet?week=${addDays(data.monday, 7)}`} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-surface-muted" aria-label="Next week">
              <ChevronRight className="size-4" />
            </Link>
          </div>
          {!isThisWeek && <Button variant="ghost" size="sm" asChild><Link href="/timesheet">This week</Link></Button>}
          <div className="ml-auto flex items-baseline gap-2">
            <span className="text-sm text-muted-foreground">Week total</span>
            <span className="text-[28px] font-semibold leading-none tabular">{formatHours(weekTotal)}</span>
          </div>
        </div>

        {/* Desktop / tablet grid: Mon–Sun × projects */}
        <div className="mt-5 hidden overflow-x-auto px-3 md:block">
          <table className="w-full min-w-[860px] border-separate border-spacing-x-1.5 border-spacing-y-1.5 text-sm">
            <thead>
              <tr>
                <th className="w-60 px-3 text-left text-[13px] font-normal text-muted-foreground">Project</th>
                {data.days.map((d) => (
                  <th key={d} className={cn("rounded-2xl px-2 py-2 text-center text-[13px] font-normal text-muted-foreground", d === today && "bg-ink text-white")}>
                    <div className="font-medium">{formatDow(d)}</div>
                    <div className="tabular text-xs opacity-80">{formatShortDate(d)}</div>
                  </th>
                ))}
                <th className="w-20 px-3 text-right text-[13px] font-normal text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="rounded-2xl bg-white/60 px-3 py-10 text-center text-sm text-muted-foreground">
                    You aren&apos;t on any open projects yet.
                  </td>
                </tr>
              )}
              {data.rows.map((p) => {
                const rowTotal = sum(rows.filter((r) => r.project.id === p.id).map((r) => r.hours));
                return (
                  <tr key={p.id} className="align-top">
                    <td className="rounded-2xl bg-white/90 px-3 py-2.5">
                      <Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                      {!p.loggable && <div className="text-xs text-muted-foreground">Closed for logging</div>}
                    </td>
                    {data.days.map((d) => {
                      const entries = cellLogs(p.id, d);
                      return (
                        <td key={d} className={cn("rounded-2xl bg-white/60 p-1.5", d === today && "bg-white")}>
                          <div className="flex min-h-9 flex-col gap-1">
                            {entries.map((e) =>
                              e.canEdit ? (
                                <TimeLogDialog key={e.id} options={opts} log={e} currentUserId={actor.id}>
                                  <button type="button" className="w-full"><EntryChip log={e} /></button>
                                </TimeLogDialog>
                              ) : (
                                <EntryChip key={e.id} log={e} />
                              ),
                            )}
                            {p.loggable && canAddOn(d) && (
                              <TimeLogDialog options={opts} defaults={{ projectId: p.id, date: d }}>
                                <button
                                  type="button"
                                  className="flex h-7 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-black/10 text-muted-foreground opacity-60 transition hover:border-[#1154ed] hover:text-foreground hover:opacity-100"
                                  aria-label={`Add time to ${p.name} on ${formatShortDate(d)}`}
                                >
                                  <Plus className="size-3.5" />
                                </button>
                              </TimeLogDialog>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-right font-semibold tabular">{rowTotal ? formatHours(rowTotal) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-3 py-2 text-[13px] text-muted-foreground">Daily total</td>
                {data.days.map((d) => {
                  const t = dayTotal(d);
                  return (
                    <td key={d} className={cn("rounded-2xl px-2 py-2 text-center font-semibold tabular", t > MAX_HOURS_PER_DAY && "text-[#b23b3b]")}>
                      {t ? formatHours(t) : <span className="font-normal text-muted-foreground">—</span>}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right text-base font-semibold tabular">{formatHours(weekTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile: one block per day */}
        <div className="mt-5 space-y-3 px-4 md:hidden">
          {data.days.map((d) => {
            const entries = rows.filter((r) => r.date === d);
            return (
              <div key={d} className={cn("tile p-4", d === today && "ring-2 ring-ink-start")}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {formatDow(d)} {formatShortDate(d)} {d === today && <span className="ml-1 text-xs font-normal text-muted-foreground">Today</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular">{formatHours(dayTotal(d))}</span>
                    {canAddOn(d) && (
                      <TimeLogDialog options={opts} defaults={{ date: d }}>
                        <Button size="xs" variant="outline"><Plus />Add</Button>
                      </TimeLogDialog>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {entries.length === 0 && <p className="text-xs text-muted-foreground">No entries</p>}
                  {entries.map((e) => {
                    const body = (
                      <div className="flex items-start justify-between gap-3 rounded-2xl bg-surface-muted px-3 py-2.5 text-left">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{e.project.name}</div>
                          <div className="line-clamp-2 text-xs text-muted-foreground">{e.description}</div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="font-semibold tabular">{formatHours(e.hours)}</span>
                          {e.commentCount > 0 && (
                            <span className={cn("inline-flex items-center gap-1 text-[11px]", e.awaitingMe ? "text-[#b23b3b]" : "text-muted-foreground")}>
                              <MessageCircle className="size-3" />{e.commentCount}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                    return e.canEdit ? (
                      <TimeLogDialog key={e.id} options={opts} log={e} currentUserId={actor.id}>
                        <button type="button" className="block w-full cursor-pointer">{body}</button>
                      </TimeLogDialog>
                    ) : (
                      <div key={e.id}>{body}</div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel pb-6">
        <PanelHeader title="Entries this week" description="Questions from your manager show up here as comments." />
        <div className="px-6 pt-4">
          <LogTable logs={[...rows].reverse()} currentUserId={actor.id} showPerson={false} editOptions={opts} emptyTitle="No entries this week" emptyDescription="Use Add time, or click + in the grid." />
        </div>
      </section>
    </>
  );
}
