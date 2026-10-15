import { ArrowLeftRight, Pencil, UserPlus, UsersRound } from "lucide-react";
import { ProjectStatusBadge, RoleBadge, SkillChips } from "@/components/app/badges";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader, PanelHeader } from "@/components/app/page-header";
import { StatusSwitch } from "@/components/app/status-switch";
import { UserDialog } from "@/components/app/user-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SortableTable } from "@/components/app/sortable-table";
import { PROJECT_STATUS, ROLE_LABEL, type AvailabilityStatus } from "@/lib/constants";
import { formatDate, formatHours } from "@/lib/dates";
import { sum } from "@/lib/utils";
import { requireActor } from "@/server/actor";
import { getAvailability } from "@/server/services/availability";
import { getLentOut } from "@/server/services/projects";
import { listUsers } from "@/server/services/users";

export const metadata = { title: "My team" };

const STATUS_ORDER: Record<AvailabilityStatus, number> = { AVAILABLE: 0, PARTIALLY_AVAILABLE: 1, OCCUPIED: 2, ON_LEAVE: 3 };

export default async function TeamPage() {
  const actor = await requireActor(["MANAGER"]);
  const [team, availability, lentOut] = await Promise.all([listUsers(actor), getAvailability(actor), getLentOut(actor.id)]);
  const mine = availability.find((t) => t.manager.id === actor.id);
  const statusOf = (id: string) => mine?.people.find((p) => p.id === id);
  const active = team.filter((u) => u.isActive);

  return (
    <>
      <PageHeader
        title="My team"
        description={`${active.length} ${active.length === 1 ? "person reports" : "people report"} to you. Skills are managed by the Design Head.`}
        actions={
          <UserDialog mode="manager">
            <Button size="lg"><UserPlus />Add person</Button>
          </UserDialog>
        }
      />
      <section className="panel overflow-hidden">
        {team.length === 0 ? (
          <div className="p-6"><EmptyState icon={UsersRound} title="Your team is empty" description="Add Associate Designers and Mid Designers to start onboarding them to projects." /></div>
        ) : (
          <SortableTable
            defaultSort={{ col: 0, dir: "asc" }}
            columns={[
              { label: "Name", className: "pl-6", cellClassName: "pl-6" },
              { label: "Role" },
              { label: "Availability" },
              { label: "Active projects", firstDir: "desc", cellClassName: "max-w-64 text-sm text-muted-foreground" },
              { label: "Skills", cellClassName: "min-w-40" },
              { label: "This week", className: "text-right", cellClassName: "text-right font-semibold tabular" },
              { label: "Edit", sortable: false, className: "pr-6 text-right", cellClassName: "pr-6 text-right" },
            ]}
            rows={team.map((u) => {
              const s = statusOf(u.id);
              const skills = u.skills.map((x) => x.skill.name);
              return {
                id: u.id,
                className: u.isActive ? undefined : "opacity-60",
                sort: [u.name, ROLE_LABEL[u.role], s ? STATUS_ORDER[s.status] : null, s?.activeProjects.length ?? 0, skills.length ? skills.join(", ") : null, s?.hoursThisWeek ?? 0, null],
                cells: [
                  <div key="n" className="flex items-center gap-3">
                    <Avatar name={u.name} className="size-9 text-[11px]" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{u.name}{!u.isActive && <span className="ml-1 text-xs text-muted-foreground">(inactive)</span>}</div>
                      <div className="truncate text-xs text-muted-foreground">{u.jobTitle} · {u.email}</div>
                    </div>
                  </div>,
                  <RoleBadge key="r" role={u.role} />,
                  s ? <StatusSwitch key="s" userId={u.id} status={s.status} autoStatus={s.autoStatus} overridden={s.overridden} compact label={`${u.name.split(" ")[0]}'s availability`} /> : "—",
                  s?.activeProjects.length
                    ? s.activeProjects.map((p) => (
                        <span key={p.id} className="mr-2 inline-block">
                          {p.name}
                          {p.borrowedBy && <span className="text-xs text-[#1d6f84]"> · for {p.borrowedBy.split(" ")[0]}</span>}
                        </span>
                      ))
                    : "None",
                  <SkillChips key="k" skills={skills} max={3} />,
                  formatHours(s?.hoursThisWeek ?? 0),
                  <UserDialog key="e" mode="manager" user={u}>
                    <button type="button" className="icon-btn size-9" aria-label={`Edit ${u.name}`}><Pencil /></button>
                  </UserDialog>,
                ],
              };
            })}
          />
        )}
      </section>

      <section className="panel mt-6 pb-6">
        <PanelHeader
          title={<span className="flex items-center gap-2"><ArrowLeftRight className="size-4 text-[#1d6f84]" />Lent to other teams</span>}
          description={`Where other managers have borrowed your people, and the hours logged there (read-only).${lentOut.length ? ` ${formatHours(sum(lentOut.map((l) => l.hours)))} in total.` : ""}`}
        />
        <div className="px-6 pt-4">
          {lentOut.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="No one is borrowed right now" description="When another Design Manager onboards one of your people, it shows up here." />
          ) : (
            <div className="tile overflow-hidden">
              <SortableTable
                defaultSort={{ col: 4, dir: "asc" }}
                columns={[
                  { label: "Person", className: "pl-5", cellClassName: "pl-5" },
                  { label: "Project" },
                  { label: "Borrowed by" },
                  { label: "Status" },
                  { label: "ETA", cellClassName: "tabular" },
                  { label: "Hours logged there", className: "pr-5 text-right", cellClassName: "pr-5 text-right font-semibold tabular" },
                ]}
                rows={lentOut.map((l) => ({
                  id: `${l.user.id}-${l.project.id}`,
                  sort: [l.user.name, l.project.name, l.borrowedBy.name, PROJECT_STATUS[l.project.status].label, l.project.eta, l.hours],
                  cells: [
                    <div key="p" className="flex items-center gap-2.5"><Avatar name={l.user.name} className="size-8 text-[10px]" /><span className="font-medium">{l.user.name}</span></div>,
                    l.project.name,
                    l.borrowedBy.name,
                    <ProjectStatusBadge key="s" status={l.project.status} />,
                    formatDate(l.project.eta),
                    formatHours(l.hours),
                  ],
                }))}
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
