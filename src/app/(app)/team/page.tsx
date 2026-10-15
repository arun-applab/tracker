import Link from "next/link";
import { ArrowLeftRight, Pencil, UserPlus, UsersRound } from "lucide-react";
import { ProjectStatusBadge, RoleBadge, SkillChips } from "@/components/app/badges";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader, PanelHeader } from "@/components/app/page-header";
import { StatusSwitch } from "@/components/app/status-switch";
import { UserDialog } from "@/components/app/user-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatHours } from "@/lib/dates";
import { sum } from "@/lib/utils";
import { requireActor } from "@/server/actor";
import { getAvailability } from "@/server/services/availability";
import { getLentOut } from "@/server/services/projects";
import { listUsers } from "@/server/services/users";

export const metadata = { title: "My team" };

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
          <div className="p-6"><EmptyState icon={UsersRound} title="Your team is empty" description="Add Associate Designers and Team Members to start onboarding them to projects." /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Active projects</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead className="text-right">This week</TableHead>
                <TableHead className="pr-6 text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((u) => {
                const s = statusOf(u.id);
                return (
                  <TableRow key={u.id} className={u.isActive ? undefined : "opacity-60"}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} className="size-9 text-[11px]" />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{u.name}{!u.isActive && <span className="ml-1 text-xs text-muted-foreground">(inactive)</span>}</div>
                          <div className="truncate text-xs text-muted-foreground">{u.jobTitle} · {u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><RoleBadge role={u.role} /></TableCell>
                    <TableCell>{s ? <StatusSwitch userId={u.id} status={s.status} autoStatus={s.autoStatus} overridden={s.overridden} compact label={`${u.name.split(" ")[0]}'s availability`} /> : "—"}</TableCell>
                    <TableCell className="max-w-64 text-sm text-muted-foreground">
                      {s?.activeProjects.length
                        ? s.activeProjects.map((p) => (
                            <span key={p.id} className="mr-2 inline-block">
                              {p.name}
                              {p.borrowedBy && <span className="text-xs text-[#1d6f84]"> · for {p.borrowedBy.split(" ")[0]}</span>}
                            </span>
                          ))
                        : "None"}
                    </TableCell>
                    <TableCell className="min-w-40"><SkillChips skills={u.skills.map((x) => x.skill.name)} max={3} /></TableCell>
                    <TableCell className="text-right font-semibold tabular">{formatHours(s?.hoursThisWeek ?? 0)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <UserDialog mode="manager" user={u}>
                        <button type="button" className="icon-btn size-9" aria-label={`Edit ${u.name}`}><Pencil /></button>
                      </UserDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Person</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Borrowed by</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead className="pr-5 text-right">Hours logged there</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lentOut.map((l) => (
                    <TableRow key={`${l.user.id}-${l.project.id}`}>
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-2.5"><Avatar name={l.user.name} className="size-8 text-[10px]" /><span className="font-medium">{l.user.name}</span></div>
                      </TableCell>
                      <TableCell>{l.project.name}</TableCell>
                      <TableCell>{l.borrowedBy.name}</TableCell>
                      <TableCell><ProjectStatusBadge status={l.project.status} /></TableCell>
                      <TableCell className="tabular">{formatDate(l.project.eta)}</TableCell>
                      <TableCell className="pr-5 text-right font-semibold tabular">{formatHours(l.hours)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
