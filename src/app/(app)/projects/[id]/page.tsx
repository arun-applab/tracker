import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CalendarDays, CircleX, Clock, Hourglass, Pencil, Plus, UserPlus, Users } from "lucide-react";
import { AutoSubmitForm } from "@/components/app/auto-submit-form";
import { ApprovalBadge, BorrowedTag, OverdueBadge, PriorityBadge, ProjectStatusBadge, RoleBadge } from "@/components/app/badges";
import { EmptyState } from "@/components/app/empty-state";
import { LogTable } from "@/components/app/log-table";
import { PanelHeader } from "@/components/app/page-header";
import { FigmaLinks, OnboardDialog, StatusSelect } from "@/components/app/project-actions";
import { ProjectReviewActions } from "@/components/app/project-review";
import { TimeLogDialog } from "@/components/app/time-log-dialog";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SortableTable } from "@/components/app/sortable-table";
import { PROJECT_STATUS, ROLE_LABEL } from "@/lib/constants";
import { addDays, formatDate, formatHours, isValidIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { formatDateTime, todayIso } from "@/lib/server-time";
import { cn } from "@/lib/utils";
import { requireActor } from "@/server/actor";
import { getLogFormOptions } from "@/server/form-options";
import { isClosed, isHead, isProjectManager } from "@/server/permissions";
import { toLogRow } from "@/server/serializers";
import { getOnboardablePeople, getProjectDetail } from "@/server/services/projects";

type SP = Promise<{ from?: string; to?: string; person?: string; role?: string }>;

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const actor = await requireActor();
  const { id } = await params;
  const sp = await searchParams;
  const filters = {
    // Default to the last 30 days so long-running projects stay readable; "All dates" lifts it.
    from: sp.from === "all" ? undefined : sp.from && isValidIso(sp.from) ? sp.from : addDays(todayIso(), -29),
    to: sp.to && isValidIso(sp.to) ? sp.to : undefined,
    userId: sp.person || undefined,
    role: sp.role === "MANAGER" || sp.role === "ASSOCIATE_DESIGNER" || sp.role === "MID_DESIGNER" ? sp.role : undefined,
  } as const;

  let data;
  try {
    data = await getProjectDetail(actor, id, filters);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
  const { project, access, teams, unteamed, teamHours, perPerson, teamTotals, total, ownHours, borrowedHours, myHours, logs, overdue, can } = data;
  const [logOptions, onboardable] = await Promise.all([getLogFormOptions(actor), can.onboard ? getOnboardablePeople(actor, project.id, access) : Promise.resolve([])]);
  const rows = logs.map((l) => toLogRow(actor, l));
  const iManage = isProjectManager(actor, access);
  const approved = project.approval === "APPROVED";
  const canSelfLog = approved && !isHead(actor) && !isClosed(project.status) && (iManage || access.memberIds.includes(actor.id));
  const filtered = !!((sp.from && sp.from !== "all") || filters.to || filters.userId || filters.role);
  const hoursOf = (uid: string) => perPerson.find((p) => p.id === uid)?.hours ?? 0;
  const everyone = [...project.managers.map((m) => m.manager), ...project.assignments.map((a) => a.user)];
  const links = project.links.map((l) => ({
    id: l.id,
    title: l.title,
    url: l.url,
    addedBy: l.addedBy.name,
    addedAt: formatDate(l.createdAt),
    canDelete: can.deleteLink(l),
  }));

  return (
    <>
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Projects
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">{project.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-[15px] text-muted-foreground">
            <span>{project.client}</span>
            <span aria-hidden>·</span>
            <PriorityBadge priority={project.priority} />
            <ApprovalBadge approval={project.approval} />
            {overdue && <OverdueBadge />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {everyone.length > 0 && (
            <div className="mr-1 rounded-full bg-white/70 p-1.5 pr-3 shadow-sm">
              <div className="flex items-center gap-2">
                <AvatarStack people={everyone} max={7} size="size-9" />
                <span className="text-xs text-muted-foreground">{everyone.length} {everyone.length === 1 ? "person" : "people"}</span>
              </div>
            </div>
          )}
          {can.changeStatus ? <StatusSelect projectId={project.id} status={project.status} /> : <ProjectStatusBadge status={project.status} className="h-10 px-4 text-sm" />}
          {can.editDetails && approved && (
            <Link href={`/projects/${project.id}/edit`} className="icon-btn size-10" title="Edit project & managers" aria-label="Edit project">
              <Pencil />
            </Link>
          )}
          {canSelfLog && logOptions && (
            <TimeLogDialog options={logOptions} defaults={{ projectId: project.id }}>
              <Button size="lg"><Plus />Add time</Button>
            </TimeLogDialog>
          )}
        </div>
      </div>

      {/* Approval (projects requested by a Design Manager) */}
      {!approved && (
        <section
          className={cn(
            "mb-6 flex flex-col gap-4 rounded-[28px] border px-6 py-5 md:flex-row md:items-center md:justify-between",
            project.approval === "PENDING" ? "border-amber-200 bg-amber-50/90" : "border-[#f3c4c4] bg-[#fde2e1]/80",
          )}
        >
          <div className="flex items-start gap-3">
            <span className={cn("mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full", project.approval === "PENDING" ? "bg-amber-200/70 text-amber-900" : "bg-white/80 text-[#b23b3b]")}>
              {project.approval === "PENDING" ? <Hourglass className="size-5" /> : <CircleX className="size-5" />}
            </span>
            <div>
              <p className="font-semibold">
                {project.approval === "PENDING"
                  ? can.review
                    ? `${project.createdBy.name} requested this project`
                    : "Waiting for the Design Head's approval"
                  : `Declined by ${project.reviewedBy?.name ?? "the Design Head"}`}
              </p>
              <p className="mt-0.5 text-sm text-foreground/75">
                {project.approval === "PENDING"
                  ? can.review
                    ? `Sent ${formatDateTime(project.submittedAt ?? project.createdAt)}. Once you approve it, the managers can onboard designers and time can be logged.`
                    : "Designers can be onboarded and time logged once it's approved. You'll get a notification."
                  : project.approvalNote
                    ? `“${project.approvalNote}”`
                    : "No reason given."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {can.review && <ProjectReviewActions projectId={project.id} projectName={project.name} />}
            {can.editDetails && !can.review && (
              <Button asChild variant={project.approval === "REJECTED" ? "default" : "outline"}>
                <Link href={`/projects/${project.id}/edit`}><Pencil />{project.approval === "REJECTED" ? "Edit & resubmit" : "Edit request"}</Link>
              </Button>
            )}
            {can.review && (
              <Button asChild variant="ghost">
                <Link href={`/projects/${project.id}/edit`}><Pencil />Edit</Link>
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Key facts */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={cn("panel p-5", overdue && "bg-[#fde2e1]/70")}>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarClock className="size-4" />ETA</p>
          <p className={cn("mt-2 text-xl font-semibold tabular", overdue && "text-[#b23b3b]")}>{formatDate(project.eta)}</p>
        </div>
        <div className="panel p-5">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="size-4" />Start date</p>
          <p className="mt-2 text-xl font-semibold tabular">{formatDate(project.startDate)}</p>
        </div>
        {teamHours ? (
          <div className="rounded-[24px] bg-ink p-5 text-white">
            <p className="flex items-center gap-1.5 text-sm text-white/70"><Clock className="size-4" />Total hours</p>
            <p className="mt-2 text-[28px] font-semibold leading-none tabular">{formatHours(total)}</p>
            <p className="mt-2 text-xs text-white/70 tabular">
              Own team {formatHours(ownHours)} · Borrowed {formatHours(borrowedHours)}
            </p>
          </div>
        ) : (
          <div className="rounded-[24px] bg-ink p-5 text-white">
            <p className="flex items-center gap-1.5 text-sm text-white/70"><Clock className="size-4" />My hours</p>
            <p className="mt-2 text-[28px] font-semibold leading-none tabular">{formatHours(myHours)}</p>
          </div>
        )}
        <div className="panel p-5">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="size-4" />{project.submittedAt ? "Requested by" : "Created by"}</p>
          <p className="mt-2 truncate text-xl font-semibold">{project.createdBy.name}</p>
        </div>
      </div>

      {/* Overview + Figma */}
      <section className="panel mb-6 pb-6">
        <PanelHeader title="Overview" />
        <div className="grid grid-cols-1 gap-6 px-6 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/80">{project.description || "No description yet."}</p>
          <FigmaLinks projectId={project.id} links={links} canAdd={can.addLink} />
        </div>
      </section>

      {/* Team journey: one column per assigned manager */}
      <section className="panel mb-6 pb-6">
        <PanelHeader
          title="Project team"
          description={teams.length ? `${teams.length} ${teams.length === 1 ? "team" : "teams"} on this project · managers can borrow people from other teams` : undefined}
          actions={
            can.onboard && (
              <OnboardDialog
                projectId={project.id}
                people={onboardable}
                current={project.assignments.filter((a) => onboardable.some((o) => o.id === a.userId && !o.lockedBy)).map((a) => a.userId)}
                headView={isHead(actor)}
                trigger={
                  <Button variant="outline"><UserPlus />{isHead(actor) ? "Onboard people" : "Onboard / borrow"}</Button>
                }
              />
            )
          }
        />
        <div className="px-6 pt-5">
          {teams.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Design Manager assigned yet"
              description={can.editDetails ? "Edit the project to assign one or more Design Managers." : "The Design Head will assign a manager."}
              action={can.editDetails && approved ? <Button asChild><Link href={`/projects/${project.id}/edit`}>Assign managers</Link></Button> : undefined}
            />
          ) : (
            <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {teams.map((t, i) => {
                const mine = t.manager.id === actor.id;
                const teamTotal = teamTotals.find((x) => x.managerId === t.manager.id)?.hours ?? 0;
                return (
                  <div key={t.manager.id} className="relative">
                    {i > 0 && <span aria-hidden className="absolute -left-4 top-12 hidden h-px w-4 border-t border-dashed border-[#6f8ff0] xl:block" />}
                    <div className={cn("tile h-full p-4", mine && "ring-2 ring-ink-start")}>
                      <div className="flex items-center gap-3 border-b border-black/[0.06] pb-3">
                        <Avatar name={t.manager.name} className="size-11 text-sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{t.manager.name}{mine && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}</p>
                          <p className="truncate text-xs text-muted-foreground">Design Manager · {t.manager.jobTitle}</p>
                        </div>
                        {teamHours && (
                          <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white tabular" title="Team hours on this project">
                            {formatHours(teamTotal)}
                          </span>
                        )}
                      </div>
                      <ul className="mt-2 space-y-1">
                        {t.members.length === 0 && <li className="px-1 py-3 text-sm text-muted-foreground">{!approved ? "Onboarding opens once the Design Head approves the project." : mine ? "Onboard people from your team." : "No one onboarded yet."}</li>}
                        {t.members.map((m) => (
                          <li key={m.id} className="flex items-center gap-3 rounded-2xl px-1 py-1.5">
                            <Avatar name={m.name} className="size-9 text-[11px]" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{m.name}{m.id === actor.id && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}</p>
                              <p className="truncate text-xs text-muted-foreground">{m.jobTitle ?? ROLE_LABEL[m.role]}</p>
                              {m.borrowed && m.homeManagerName && <BorrowedTag managerName={m.homeManagerName} />}
                            </div>
                            {teamHours && <span className="text-sm font-medium tabular text-foreground/80">{formatHours(hoursOf(m.id))}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {unteamed.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Onboarded by the Design Head: {unteamed.map((u) => `${u.name}${u.homeManagerName ? ` (${u.homeManagerName.split(" ")[0]}'s team)` : ""}`).join(", ")}
            </p>
          )}
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Hours per person — Head and the project's managers only */}
        {teamHours ? (
          <section className="panel pb-4">
            <PanelHeader title="Hours per person" description={`Everyone who has logged time, including the managers · Own team ${formatHours(ownHours)} · Borrowed ${formatHours(borrowedHours)}`} />
            <div className="px-3 pt-3">
              {perPerson.length === 0 ? (
                <div className="px-3 pb-2"><EmptyState icon={Clock} title="No hours logged yet" /></div>
              ) : (
                <SortableTable
                  defaultSort={{ col: 3, dir: "desc" }}
                  columns={[
                    { label: "Person", className: "pl-3", cellClassName: "pl-3" },
                    { label: "Role" },
                    { label: "Team", cellClassName: "text-sm text-muted-foreground" },
                    { label: "Hours", className: "pr-3 text-right", cellClassName: "pr-3 text-right text-[15px] font-semibold tabular" },
                  ]}
                  rows={perPerson.map((p) => {
                    const team = teams.find((t) => t.manager.id === p.teamManagerId)?.manager.name.split(" ")[0] ?? null;
                    return {
                      id: p.id,
                      sort: [p.name, ROLE_LABEL[p.role], team, p.hours],
                      cells: [
                        <div key="n" className="flex items-center gap-2.5">
                          <Avatar name={p.name} className="size-8 text-[10px]" />
                          <span className="font-medium">{p.name}</span>
                          {!p.assigned && <span className="text-xs text-muted-foreground">(no longer on project)</span>}
                          {p.borrowed && p.homeManagerName && <BorrowedTag managerName={p.homeManagerName} short />}
                        </div>,
                        <RoleBadge key="r" role={p.role} />,
                        team ?? "—",
                        formatHours(p.hours),
                      ],
                    };
                  })}
                />
              )}
            </div>
          </section>
        ) : (
          <section className="panel p-6">
            <h2 className="text-lg font-semibold tracking-tight">Your time on this project</h2>
            <p className="mt-1 text-sm text-muted-foreground">You see your own entries. Team totals are visible to the Design Managers and the Design Head.</p>
            <p className="mt-5 text-[40px] font-semibold leading-none tabular">{formatHours(myHours)}</p>
          </section>
        )}

        <section className="panel pb-6">
          <PanelHeader title="Status history" />
          <div className="px-6 pt-5">
            {project.statusChanges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No status changes yet.</p>
            ) : (
              <ol className="relative space-y-5 border-l border-dashed border-[#6f8ff0]/60 pl-5">
                {project.statusChanges.map((c) => (
                  <li key={c.id} className="relative">
                    <span className={cn("absolute -left-[27px] top-0.5 size-3.5 rounded-full ring-4 ring-white", PROJECT_STATUS[c.toStatus].dot)} />
                    <p className="text-sm">
                      {c.fromStatus ? (
                        <>
                          <span className="text-muted-foreground">{PROJECT_STATUS[c.fromStatus].label}</span> → <span className="font-semibold">{PROJECT_STATUS[c.toStatus].label}</span>
                        </>
                      ) : (
                        <>Created as <span className="font-semibold">{PROJECT_STATUS[c.toStatus].label}</span></>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.changedBy.name} · {formatDateTime(c.changedAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>

      {/* Daily log */}
      <section className="panel pb-6">
        <PanelHeader
          title={teamHours ? "Daily time log" : "My time entries"}
          description={teamHours ? "Every entry on this project. Use the comment button to ask about an entry." : "Only your own entries are shown."}
        />
        <div className="space-y-4 px-6 pt-4">
          <AutoSubmitForm className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
            <label className="grid gap-1 text-xs text-muted-foreground">From<Input type="date" name="from" defaultValue={filters.from} className="lg:w-44" /></label>
            <label className="grid gap-1 text-xs text-muted-foreground">To<Input type="date" name="to" defaultValue={filters.to} className="lg:w-44" /></label>
            {teamHours && (
              <label className="grid gap-1 text-xs text-muted-foreground">
                Person
                <NativeSelect name="person" defaultValue={filters.userId ?? ""} className="lg:w-56">
                  <option value="">Everyone</option>
                  {perPerson.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </NativeSelect>
              </label>
            )}
            {teamHours && (
              <label className="grid gap-1 text-xs text-muted-foreground">
                Role
                <NativeSelect name="role" defaultValue={filters.role ?? ""} className="lg:w-52">
                  <option value="">All roles</option>
                  <option value="MANAGER">{ROLE_LABEL.MANAGER}</option>
                  <option value="MID_DESIGNER">{ROLE_LABEL.MID_DESIGNER}</option>
                  <option value="ASSOCIATE_DESIGNER">{ROLE_LABEL.ASSOCIATE_DESIGNER}</option>
                </NativeSelect>
              </label>
            )}
            <Button variant="ghost" size="sm" asChild><Link href={`/projects/${project.id}?from=all`} scroll={false}>All dates</Link></Button>
            {filtered && <Button variant="ghost" size="sm" asChild><Link href={`/projects/${project.id}`} scroll={false}>Reset</Link></Button>}
          </AutoSubmitForm>
          <LogTable
            logs={rows}
            currentUserId={actor.id}
            showProject={false}
            showPerson={teamHours}
            editOptions={logOptions}
            emptyTitle={filtered ? "No entries match these filters" : "No time logged yet"}
            emptyDescription={filtered ? "Try a wider date range." : canSelfLog ? "Add your first entry with the Add time button." : undefined}
          />
          {rows.length >= 300 && <p className="text-xs text-muted-foreground">Showing the 300 most recent entries — narrow the date range to see older ones.</p>}
        </div>
      </section>
    </>
  );
}
