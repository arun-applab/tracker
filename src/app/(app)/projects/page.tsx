import Link from "next/link";
import { CalendarClock, FolderKanban, Frame, Plus, Search, UserRoundX } from "lucide-react";
import { AutoSubmitForm } from "@/components/app/auto-submit-form";
import { OverdueBadge, PriorityBadge, ProjectStatusBadge } from "@/components/app/badges";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { AvatarStack } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PRIORITIES, PRIORITY, PROJECT_STATUS, PROJECT_STATUSES, type Priority, type ProjectStatus } from "@/lib/constants";
import { formatDate, formatHours } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { requireActor } from "@/server/actor";
import { isHead } from "@/server/permissions";
import { listProjects } from "@/server/services/projects";
import { listManagers } from "@/server/services/users";

export const metadata = { title: "Projects" };

type SP = Promise<{ q?: string; status?: string; priority?: string; manager?: string; sort?: string }>;

export default async function ProjectsPage({ searchParams }: { searchParams: SP }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const status = PROJECT_STATUSES.includes(sp.status as ProjectStatus) ? (sp.status as ProjectStatus) : undefined;
  const priority = PRIORITIES.includes(sp.priority as Priority) ? (sp.priority as Priority) : undefined;
  const sort = sp.sort === "eta_desc" ? "eta_desc" : "eta_asc";
  const head = isHead(actor);

  const [projects, managers] = await Promise.all([
    listProjects(actor, { q: sp.q?.trim() || undefined, status, priority, managerId: head ? sp.manager || undefined : undefined, sort }),
    head ? listManagers() : Promise.resolve([]),
  ]);
  const filtered = !!(sp.q || status || priority || sp.manager);

  return (
    <>
      <PageHeader
        title={actor.role === "ASSOCIATE_DESIGNER" || actor.role === "TEAM_MEMBER" ? "My Projects" : "Projects"}
        description={head ? "Every project across the department." : "Only projects you're assigned to."}
        actions={
          head && (
            <Button asChild size="lg">
              <Link href="/projects/new"><Plus />New project</Link>
            </Button>
          )
        }
      />

      <AutoSubmitForm className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" name="q" defaultValue={sp.q} placeholder="Search project or client…" className="pl-10" aria-label="Search" />
        </div>
        <NativeSelect name="status" defaultValue={status ?? ""} aria-label="Status" className="lg:w-44">
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{PROJECT_STATUS[s].label}</option>)}
        </NativeSelect>
        {head && (
          <NativeSelect name="manager" defaultValue={sp.manager ?? ""} aria-label="Manager" className="lg:w-56">
            <option value="">All managers</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </NativeSelect>
        )}
        <NativeSelect name="priority" defaultValue={priority ?? ""} aria-label="Priority" className="lg:w-40">
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
        </NativeSelect>
        <NativeSelect name="sort" defaultValue={sort} aria-label="Sort" className="lg:w-48">
          <option value="eta_asc">ETA: soonest first</option>
          <option value="eta_desc">ETA: latest first</option>
        </NativeSelect>
        {filtered && <Button variant="ghost" size="sm" asChild><Link href="/projects">Clear filters</Link></Button>}
      </AutoSubmitForm>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={filtered ? "No projects match these filters" : head ? "No projects yet" : "You're not on any projects yet"}
          description={filtered ? "Try clearing a filter." : head ? "Create a project and assign it to a Design Manager." : "Projects appear here once you're assigned or onboarded."}
          action={head && !filtered ? <Button asChild><Link href="/projects/new"><Plus />New project</Link></Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="panel group flex flex-col gap-4 p-5 transition hover:bg-white/80 focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-[17px] font-semibold tracking-tight group-hover:underline">{p.name}</h2>
                  <p className="truncate text-sm text-muted-foreground">{p.client}</p>
                </div>
                <ProjectStatusBadge status={p.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <PriorityBadge priority={p.priority} />
                <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs ring-1 ring-black/[0.06]", p.overdue && "text-[#b23b3b]")}>
                  <CalendarClock className="size-3.5" />
                  {formatDate(p.eta)}
                </span>
                {p.overdue && <OverdueBadge />}
                {p.linkCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs ring-1 ring-black/[0.06]">
                    <Frame className="size-3.5" />
                    {p.linkCount} Figma
                  </span>
                )}
              </div>
              <div className="tile mt-auto flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Managers</p>
                  {p.managers.length ? (
                    <div className="mt-1 flex items-center gap-2">
                      <AvatarStack people={p.managers} max={3} size="size-7" />
                      <span className="truncate text-xs text-muted-foreground">{p.managers.map((m) => m.name.split(" ")[0]).join(", ")}</span>
                    </div>
                  ) : (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-[#b23b3b]"><UserRoundX className="size-3.5" />Unassigned</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Team</p>
                  <div className="mt-1 flex justify-end">{p.members.length ? <AvatarStack people={p.members} max={4} size="size-7" /> : <span className="text-xs text-muted-foreground">—</span>}</div>
                </div>
                <div className="shrink-0 border-l border-black/[0.06] pl-3 text-right">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{p.hours !== null ? "Hours" : "My hours"}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular">{formatHours(p.hours ?? p.myHours)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">{projects.length} {projects.length === 1 ? "project" : "projects"}</p>
    </>
  );
}
