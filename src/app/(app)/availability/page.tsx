import Link from "next/link";
import { ArrowLeftRight, ChevronRight, Hand, User, UsersRound } from "lucide-react";
import { AutoSubmitForm } from "@/components/app/auto-submit-form";
import { AvailabilityBadge, RoleBadge, SkillChips } from "@/components/app/badges";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatusSwitch } from "@/components/app/status-switch";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AVAILABILITY, AVAILABILITY_STATUSES, ROLE_LABEL, type AvailabilityStatus } from "@/lib/constants";
import { formatHours } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { requireActor } from "@/server/actor";
import { getAvailability, type AvailabilityPerson } from "@/server/services/availability";

export const metadata = { title: "Team availability" };

function PersonRow({ p, lead }: { p: AvailabilityPerson; lead?: boolean }) {
  return (
    <TableRow className={cn(lead && "bg-white/50")}>
      <TableCell className="pl-5">
        <div className="flex items-center gap-3">
          <Avatar name={p.name} className="size-9 text-[11px]" />
          <div className="min-w-0">
            <div className="truncate font-medium">{p.name}</div>
            <div className="truncate text-xs text-muted-foreground">{p.jobTitle}</div>
          </div>
        </div>
      </TableCell>
      <TableCell><RoleBadge role={p.role} /></TableCell>
      <TableCell>
        {p.canSet ? (
          <StatusSwitch userId={p.id} status={p.status} autoStatus={p.autoStatus} overridden={p.overridden} compact label={`${p.name.split(" ")[0]}'s availability`} />
        ) : (
          <AvailabilityBadge status={p.status} overridden={p.overridden} setBy={p.setBy} />
        )}
        {p.overridden && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            {p.setBy === "self" ? <User className="size-3" /> : <Hand className="size-3" />}
            {p.setBy === "self" ? "Set by themselves" : `Set by ${p.setBy}`}
          </p>
        )}
      </TableCell>
      <TableCell className="min-w-56">
        {p.activeProjects.length === 0 ? (
          <span className="text-sm text-muted-foreground">None</span>
        ) : (
          <p className="text-sm">
            <span className="mr-1 inline-flex size-5 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white tabular">{p.activeProjects.length}</span>
            <span className="text-muted-foreground">{p.activeProjects.map((ap) => ap.name).join(", ")}</span>
          </p>
        )}
        {p.activeProjects.filter((ap) => ap.borrowedBy).map((ap) => (
          <p key={ap.id} className="mt-1 flex items-start gap-1 text-xs text-[#1d6f84]">
            <ArrowLeftRight className="mt-0.5 size-3 shrink-0" />
            Borrowed: {ap.name} for {ap.borrowedBy}&apos;s team
          </p>
        ))}
      </TableCell>
      <TableCell className="min-w-44"><SkillChips skills={p.skills} max={3} /></TableCell>
      <TableCell className="pr-5 text-right text-[15px] font-semibold tabular">{formatHours(p.hoursThisWeek)}</TableCell>
    </TableRow>
  );
}

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ status?: string; role?: string; skill?: string }> }) {
  const actor = await requireActor(["HEAD", "MANAGER"]);
  const sp = await searchParams;
  const status = AVAILABILITY_STATUSES.includes(sp.status as AvailabilityStatus) ? (sp.status as AvailabilityStatus) : undefined;
  const role = sp.role === "MANAGER" || sp.role === "ASSOCIATE_DESIGNER" || sp.role === "TEAM_MEMBER" ? sp.role : undefined;
  const skill = sp.skill?.trim().toLowerCase() || undefined;
  const match = (p: AvailabilityPerson) =>
    (!status || p.status === status) && (!role || p.role === role) && (!skill || p.skills.some((s) => s.toLowerCase().includes(skill)));

  const teams = (await getAvailability(actor)).map((t) => ({ ...t, all: [t.manager, ...t.people], shown: [t.manager, ...t.people].filter(match) }));
  const everyone = teams.flatMap((t) => t.all);
  const filtered = !!(status || role || skill);

  return (
    <>
      <PageHeader
        title="Team availability"
        description="Everyone can set their own status from the top bar. Managers can set it for their team."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {AVAILABILITY_STATUSES.map((s) => {
          const n = everyone.filter((p) => p.status === s).length;
          const active = status === s;
          return (
            <Link
              key={s}
              href={active ? "/availability" : `/availability?status=${s}${role ? `&role=${role}` : ""}`}
              className={cn("panel flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-white/80", active && "bg-ink text-white ")}
            >
              <span className="flex items-center gap-2.5 text-sm">
                <span className={cn("size-3 rounded-full", AVAILABILITY[s].dot)} />
                {AVAILABILITY[s].label}
              </span>
              <span className="text-2xl font-semibold tabular">{n}</span>
            </Link>
          );
        })}
      </div>

      <AutoSubmitForm className="mb-5 flex flex-wrap items-center gap-2">
        <NativeSelect name="status" defaultValue={status ?? ""} className="w-52" aria-label="Status">
          <option value="">All statuses</option>
          {AVAILABILITY_STATUSES.map((s) => <option key={s} value={s}>{AVAILABILITY[s].label}</option>)}
        </NativeSelect>
        <NativeSelect name="role" defaultValue={role ?? ""} className="w-52" aria-label="Role">
          <option value="">All roles</option>
          <option value="MANAGER">{ROLE_LABEL.MANAGER}</option>
          <option value="ASSOCIATE_DESIGNER">{ROLE_LABEL.ASSOCIATE_DESIGNER}</option>
          <option value="TEAM_MEMBER">{ROLE_LABEL.TEAM_MEMBER}</option>
        </NativeSelect>
        <Input type="search" name="skill" defaultValue={sp.skill} placeholder="Filter by skill…" className="w-52" aria-label="Skill" />
        {filtered && <Button variant="ghost" size="sm" asChild><Link href="/availability">Clear</Link></Button>}
      </AutoSubmitForm>

      {teams.length === 0 && <EmptyState icon={UsersRound} title="No teams yet" description="Add Design Managers and their teams under Users & Skills." />}

      <div className="space-y-4">
        {teams.map((t) => {
          const mine = t.manager.id === actor.id;
          return (
            <details key={t.manager.id} open={mine || actor.role === "HEAD" || filtered} className="panel group overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span className="icon-btn size-8"><ChevronRight className="transition-transform group-open:rotate-90" /></span>
                <Avatar name={t.manager.name} className="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {t.manager.name}&apos;s team {mine && <span className="ml-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-white">Your team</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.all.length} people incl. lead{filtered ? ` · ${t.shown.length} match` : ""}</p>
                </div>
                <div className="hidden gap-1.5 md:flex">
                  {AVAILABILITY_STATUSES.map((s) => {
                    const n = t.all.filter((p) => p.status === s).length;
                    return n ? <span key={s} className={cn("rounded-full px-2.5 py-1 text-xs font-medium", AVAILABILITY[s].badge)}>{n} {AVAILABILITY[s].label}</span> : null;
                  })}
                </div>
              </summary>
              {t.shown.length === 0 ? (
                <p className="border-t border-black/[0.06] px-5 py-6 text-center text-sm text-muted-foreground">No one in this team matches the filters.</p>
              ) : (
                <div className="border-t border-black/[0.06]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-5">Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Current status</TableHead>
                        <TableHead>Active projects</TableHead>
                        <TableHead>Skills</TableHead>
                        <TableHead className="pr-5 text-right">Hours this week</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {t.shown.map((p) => <PersonRow key={p.id} p={p} lead={p.id === t.manager.id} />)}
                    </TableBody>
                  </Table>
                </div>
              )}
            </details>
          );
        })}
      </div>
    </>
  );
}
