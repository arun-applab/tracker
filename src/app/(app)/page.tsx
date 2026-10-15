import Link from "next/link";
import { AlertTriangle, ArrowLeftRight, ArrowRight, CalendarClock, Clock, FolderKanban, Hourglass, MessageCircle, MessageSquareText, Plus, Timer, UserRoundX } from "lucide-react";
import { ProjectReviewActions } from "@/components/app/project-review";
import { ApprovalBadge, AvailabilityBadge, OverdueBadge, PriorityBadge, ProjectStatusBadge } from "@/components/app/badges";
import { HoursBarChart, StatusBarChart } from "@/components/app/dashboard-charts";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader, PanelHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { ThreadList } from "@/components/app/thread-list";
import { TimeLogDialog } from "@/components/app/time-log-dialog";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AVAILABILITY, AVAILABILITY_STATUSES } from "@/lib/constants";
import { addDays, diffDays, formatDate, formatHours, formatShortDate, weekStart } from "@/lib/dates";
import { todayIso } from "@/lib/server-time";
import { cn } from "@/lib/utils";
import { requireActor, type Actor } from "@/server/actor";
import { getLogFormOptions } from "@/server/form-options";
import { getDesignerDashboard, getHeadDashboard, getManagerDashboard } from "@/server/services/dashboard";

export const metadata = { title: "Dashboard" };

const greeting = (name: string) => `Welcome back, ${name.split(" ")[0]}`;

function weekLabel() {
  const mon = weekStart(todayIso());
  return `${formatShortDate(mon)} – ${formatShortDate(addDays(mon, 6))}`;
}

type ProjectCardData = {
  id: string;
  name: string;
  client: string;
  status: Parameters<typeof ProjectStatusBadge>[0]["status"];
  priority: Parameters<typeof PriorityBadge>[0]["priority"];
  eta: string;
  overdue: boolean;
  managers: { id: string; name: string }[];
  members: { id: string; name: string }[];
};

/** Compact project row used in dashboard panels. */
function ProjectRow({ p, today, right }: { p: ProjectCardData; today: string; right?: React.ReactNode }) {
  const days = diffDays(p.eta, today);
  return (
    <Link href={`/projects/${p.id}`} className="tile flex items-center gap-4 px-4 py-3 transition hover:bg-white">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{p.name}</p>
        <p className="truncate text-xs text-muted-foreground">{p.client}</p>
      </div>
      <div className="hidden sm:block">{[...p.managers, ...p.members].length > 0 && <AvatarStack people={[...p.managers, ...p.members]} max={4} size="size-7" />}</div>
      <ProjectStatusBadge status={p.status} />
      <div className="w-24 shrink-0 text-right">
        {right ?? (p.overdue ? <OverdueBadge /> : <span className={cn("text-sm font-medium tabular", days <= 3 && "text-[#b23b3b]")}>{days === 0 ? "Due today" : days > 0 ? `in ${days}d` : formatShortDate(p.eta)}</span>)}
        <p className="text-[11px] text-muted-foreground">{formatDate(p.eta)}</p>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const actor = await requireActor();
  if (actor.role === "HEAD") return <HeadHome actor={actor} />;
  if (actor.role === "MANAGER") return <ManagerHome actor={actor} />;
  return <DesignerHome actor={actor} />;
}

// ─── Design Head ────────────────────────────────────────────────────────────

async function HeadHome({ actor }: { actor: Actor }) {
  const d = await getHeadDashboard(actor);
  return (
    <>
      <PageHeader
        title={greeting(actor.name)}
        description="Department overview across every team."
        actions={<Button asChild size="lg"><Link href="/projects/new"><Plus />New project</Link></Button>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active projects" value={d.activeCount} hint={`${d.totalProjects} projects in total`} icon={FolderKanban} href="/projects" tone="dark" />
        <StatCard label="Overdue projects" value={d.overdue.length} hint="Past ETA and not completed" icon={AlertTriangle} tone={d.overdue.length ? "danger" : "good"} href="/projects?sort=eta_asc" />
        <StatCard label="Hours logged this week" value={formatHours(d.weekTotal)} hint={weekLabel()} icon={Clock} href="/time-logs" />
        <StatCard label="New suggestions" value={d.newSuggestions} hint={d.unreadSuggestions ? `${d.unreadSuggestions} unread in inbox` : "Inbox is up to date"} icon={MessageSquareText} tone={d.unreadSuggestions ? "warn" : "default"} href="/suggestions" />
      </div>

      {d.pendingRequests.length > 0 && (
        <section className="mb-6 rounded-[28px] border border-amber-200 bg-amber-50/80 px-5 py-4">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            <Hourglass className="size-4 text-amber-700" />
            Project requests waiting for your approval
            <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-semibold text-amber-900 tabular">{d.pendingRequests.length}</span>
          </p>
          <ul className="grid gap-2">
            {d.pendingRequests.map((p) => (
              <li key={p.id} className="tile flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
                <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{p.client} · requested by {p.createdBy.name} · ETA {formatDate(p.eta)}</span>
                </Link>
                <ProjectReviewActions projectId={p.id} projectName={p.name} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="panel pb-5">
          <PanelHeader title="Projects by status" description={`All ${d.totalProjects} projects`} />
          <div className="px-6 pt-4">{d.totalProjects ? <StatusBarChart data={d.statusBreakdown} /> : <EmptyState icon={FolderKanban} title="No projects yet" />}</div>
        </section>
        <section className="panel pb-5">
          <PanelHeader title="Team utilization this week" description={`Hours logged by each lead and their team · ${weekLabel()}`} />
          <div className="px-6 pt-4">
            {d.utilization.length ? (
              <HoursBarChart data={d.utilization.map((u) => ({ label: u.team, value: u.hours, sub: `${u.team} · ${u.members} people` }))} />
            ) : (
              <EmptyState icon={Clock} title="No teams yet" />
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="panel pb-6">
          <PanelHeader
            title="Needs attention"
            description="Overdue projects and active projects without a Design Manager"
            actions={<Link href="/projects" className="icon-btn" aria-label="All projects"><ArrowRight /></Link>}
          />
          <div className="space-y-2 px-6 pt-4">
            {d.overdue.length === 0 && d.unassigned.length === 0 && <EmptyState icon={CalendarClock} title="Nothing needs attention" description="No overdue or unassigned projects." />}
            {d.overdue.map((p) => (
              <ProjectRow key={p.id} p={p} today={d.today} right={<span className="text-sm font-semibold text-[#b23b3b] tabular">{diffDays(d.today, p.eta)}d late</span>} />
            ))}
            {d.unassigned.map((p) => (
              <ProjectRow key={p.id} p={p} today={d.today} right={<span className="inline-flex items-center gap-1 text-xs font-medium text-[#b23b3b]"><UserRoundX className="size-3.5" />No manager</span>} />
            ))}
          </div>
        </section>
        <section className="panel pb-6">
          <PanelHeader title="Your open discussions" description="Time-entry threads waiting for your reply" />
          <div className="px-6 pt-4"><ThreadList threads={d.threads} empty="No discussions waiting for you." /></div>
        </section>
      </div>

      <section className="panel mt-6 pb-6">
        <PanelHeader title={<span className="flex items-center gap-2"><ArrowLeftRight className="size-4 text-[#1d6f84]" />Cross-team borrowing</span>} description="Who lent people to whom, and the hours logged on borrowed work" />
        <div className="px-6 pt-4">
          {d.borrowing.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="No borrowing yet" description="When a Design Manager onboards someone from another team, it shows up here." />
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {d.borrowing.map((b) => (
                <div key={`${b.lender}-${b.borrower}`} className="tile flex items-center gap-3 px-4 py-3">
                  <Avatar name={b.lender} className="size-8 text-[10px]" />
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  <Avatar name={b.borrower} className="size-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.lender.split(" ")[0]}&apos;s team → {b.borrower.split(" ")[0]}</p>
                    <p className="text-xs text-muted-foreground">{b.people} {b.people === 1 ? "person" : "people"} · {formatHours(b.weekHours)} this week</p>
                  </div>
                  <span className="text-lg font-semibold tabular">{formatHours(b.hours)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// ─── Design Manager ─────────────────────────────────────────────────────────

async function ManagerHome({ actor }: { actor: Actor }) {
  const [d, options] = await Promise.all([getManagerDashboard(actor), getLogFormOptions(actor)]);
  return (
    <>
      <PageHeader
        title={greeting(actor.name)}
        description="Your projects, your team and what needs your attention."
        actions={
          <>
            <Button asChild variant="outline" size="lg"><Link href="/projects/new"><Plus />Request project</Link></Button>
            {options && (
              <TimeLogDialog options={options}>
                <Button size="lg"><Plus />Add time</Button>
              </TimeLogDialog>
            )}
          </>
        }
      />
      {d.myRequests.length > 0 && (
        <section className="mb-6 panel px-5 py-4">
          <p className="mb-3 flex items-center gap-2 font-semibold"><Hourglass className="size-4 text-amber-700" />Your project requests</p>
          <ul className="grid gap-2">
            {d.myRequests.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="tile flex items-center gap-3 px-4 py-3 transition hover:bg-white">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.approval === "REJECTED" ? (p.approvalNote ? `Declined: “${p.approvalNote}” — edit to resubmit` : "Declined — edit to resubmit") : `${p.client} · waiting for the Design Head`}
                    </span>
                  </span>
                  <ApprovalBadge approval={p.approval} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Hours on my projects" value={formatHours(d.hoursOnMyProjects)} hint={`This week · ${weekLabel()}`} icon={Clock} href="/time-logs" tone="dark" />
        <StatCard label="My team's hours" value={formatHours(d.hoursByMyTeam)} hint={`You: ${formatHours(d.myWeekHours)} this week`} icon={Timer} href="/team" />
        <StatCard label="Open discussions" value={d.threads.length} hint={d.threads.length ? "Waiting for your reply" : "All caught up"} icon={MessageCircle} tone={d.threads.length ? "warn" : "good"} />
        <StatCard label="Overdue projects" value={d.overdue.length} hint={`${d.projectCount} projects assigned to you`} icon={AlertTriangle} tone={d.overdue.length ? "danger" : "good"} href="/projects" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="panel pb-6">
          <PanelHeader
            title="My projects"
            description="Active, approved projects you manage — onboard your team from each project"
            actions={<Link href="/projects" className="icon-btn" aria-label="All projects"><ArrowRight /></Link>}
          />
          <div className="space-y-2 px-6 pt-4">
            {d.projects.length === 0 ? (
              <EmptyState icon={FolderKanban} title="No active projects" description="Projects appear here when the Design Head assigns them to you." />
            ) : (
              d.projects.map((p) => <ProjectRow key={p.id} p={p} today={d.today} />)
            )}
          </div>
        </section>
        <section className="panel pb-5">
          <PanelHeader title="By status" description={`${d.projectCount} projects assigned to you`} />
          <div className="px-6 pt-4">{d.projectCount ? <StatusBarChart data={d.statusBreakdown} /> : <EmptyState icon={FolderKanban} title="No projects yet" />}</div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="panel pb-6">
          <PanelHeader
            title="Team availability"
            description="Click a status to change it"
            actions={
              <div className="hidden flex-wrap gap-1.5 md:flex">
                {AVAILABILITY_STATUSES.map((s) => {
                  const n = d.team.filter((p) => p.status === s).length;
                  return n ? <span key={s} className={cn("rounded-full px-2.5 py-1 text-xs font-medium", AVAILABILITY[s].badge)}>{n} {AVAILABILITY[s].label}</span> : null;
                })}
              </div>
            }
          />
          <div className="grid grid-cols-1 gap-2 px-6 pt-4 sm:grid-cols-2">
            {d.team.map((p) => (
              <Link key={p.id} href="/availability" className="tile flex items-center gap-3 px-3.5 py-3 hover:bg-white">
                <Avatar name={p.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}{p.id === actor.id && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.activeProjects.length} active · {formatHours(p.hoursThisWeek)} this week</p>
                </div>
                <AvailabilityBadge status={p.status} overridden={p.overridden} setBy={p.setBy} />
              </Link>
            ))}
          </div>
          {d.lentOut.length > 0 && (
            <Link href="/team" className="mx-6 mt-3 flex items-center gap-2 rounded-2xl bg-[#d9f0f5]/70 px-4 py-2.5 text-sm text-[#1d6f84] hover:bg-[#d9f0f5]">
              <ArrowLeftRight className="size-4" />
              {d.lentOut.length} of your people {d.lentOut.length === 1 ? "is" : "are"} borrowed by other teams ({formatHours(d.lentOut.reduce((a, l) => a + l.hours, 0))} logged there)
              <ArrowRight className="ml-auto size-4" />
            </Link>
          )}
        </section>
        <section className="panel pb-6">
          <PanelHeader title="Due in the next 7 days" />
          <div className="space-y-2 px-6 pt-4">
            {d.dueSoon.length === 0 && d.overdue.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Nothing due this week" />
            ) : (
              [...d.overdue, ...d.dueSoon].map((p) => <ProjectRow key={p.id} p={p} today={d.today} />)
            )}
          </div>
          <div className="px-6 pt-6">
            <h3 className="mb-3 text-sm font-semibold">Open discussions</h3>
            <ThreadList threads={d.threads} empty="No time-entry questions waiting for you." />
          </div>
        </section>
      </div>
    </>
  );
}

// ─── Associate Designer / Mid Designer ───────────────────────────────────────

async function DesignerHome({ actor }: { actor: Actor }) {
  const [d, options] = await Promise.all([getDesignerDashboard(actor), getLogFormOptions(actor)]);
  const active = d.projects.filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED");
  return (
    <>
      <PageHeader
        title={greeting(actor.name)}
        description="Your projects and hours at a glance."
        actions={
          options && (
            <TimeLogDialog options={options} defaults={{ date: d.today }}>
              <Button size="lg"><Plus />Add time</Button>
            </TimeLogDialog>
          )
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Hours today" value={formatHours(d.todayHours)} hint={formatDate(d.today)} icon={Clock} href="/timesheet" tone="dark" />
        <StatCard label="Hours this week" value={formatHours(d.weekHours)} hint={weekLabel()} icon={Timer} href="/timesheet" />
        <StatCard label="Active projects" value={active.length} hint={`${d.projects.length} assigned in total`} icon={FolderKanban} href="/projects" />
        <StatCard label="Questions for you" value={d.threads.length} hint={d.threads.length ? "Your manager asked about an entry" : "Nothing to answer"} icon={MessageCircle} tone={d.threads.length ? "warn" : "good"} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="panel pb-6">
          <PanelHeader title="My projects" description="Projects you've been onboarded to" actions={<Link href="/projects" className="icon-btn" aria-label="All projects"><ArrowRight /></Link>} />
          <div className="space-y-2 px-6 pt-4">
            {d.projects.length === 0 ? (
              <EmptyState icon={FolderKanban} title="You're not on any projects yet" description="Your Design Manager will onboard you." />
            ) : (
              d.projects.map((p) => <ProjectRow key={p.id} p={p} today={d.today} right={<span className="text-sm font-semibold tabular">{formatHours(p.myHours)}</span>} />)
            )}
          </div>
        </section>
        <div className="space-y-6">
          <section className="panel pb-6">
            <PanelHeader title="Questions about your entries" />
            <div className="px-6 pt-4"><ThreadList threads={d.threads} empty="No questions — you're all caught up." /></div>
          </section>
          <section className="panel pb-6">
            <PanelHeader title="Recent entries" actions={<Link href="/timesheet" className="icon-btn" aria-label="My timesheet"><ArrowRight /></Link>} />
            <ul className="space-y-2 px-6 pt-4">
              {d.recent.length === 0 && <li className="text-sm text-muted-foreground">No entries yet.</li>}
              {d.recent.map((r) => (
                <li key={r.id} className="tile flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.project.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{formatShortDate(r.date)} · {r.description}</p>
                  </div>
                  <span className="font-semibold tabular">{formatHours(r.hours)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
