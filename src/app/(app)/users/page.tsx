import Link from "next/link";
import { Pencil, Sparkles, UserPlus, Users } from "lucide-react";
import { AutoSubmitForm } from "@/components/app/auto-submit-form";
import { RoleBadge, SkillChips } from "@/components/app/badges";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { SkillsDialog } from "@/components/app/skills-dialog";
import { UserDialog } from "@/components/app/user-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SortableTable } from "@/components/app/sortable-table";
import { formatDate } from "@/lib/dates";
import { ROLE_LABEL, type Role } from "@/lib/constants";
import { requireActor } from "@/server/actor";
import { listManagers, listSkills, listUsers } from "@/server/services/users";

export const metadata = { title: "Users & skills" };

const ROLES: Role[] = ["HEAD", "MANAGER", "MID_DESIGNER", "ASSOCIATE_DESIGNER"];

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; team?: string; inactive?: string; skill?: string }> }) {
  const actor = await requireActor(["HEAD"]);
  const sp = await searchParams;
  const [users, managers, skills] = await Promise.all([listUsers(actor), listManagers(), listSkills()]);
  const q = sp.q?.trim().toLowerCase();
  const role = ROLES.includes(sp.role as Role) ? (sp.role as Role) : undefined;
  const skillNames = skills.map((s) => s.name);
  const rows = users
    .map((u) => ({ ...u, skillList: u.skills.map((s) => s.skill.name) }))
    .filter(
      (u) =>
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
        (!role || u.role === role) &&
        (!sp.team || u.managerId === sp.team || u.id === sp.team) &&
        (!sp.skill || u.skillList.includes(sp.skill)) &&
        (sp.inactive === "1" || u.isActive),
    );
  const filtered = !!(q || role || sp.team || sp.inactive || sp.skill);
  const order: Record<Role, number> = { HEAD: 0, MANAGER: 1, MID_DESIGNER: 2, ASSOCIATE_DESIGNER: 3 };
  rows.sort((a, b) => order[a.role] - order[b.role] || (a.manager?.name ?? "").localeCompare(b.manager?.name ?? "") || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Users & skills"
        description={`${users.filter((u) => u.isActive).length} active people across ${managers.length} teams · ${skills.length} skills in use`}
        actions={
          <UserDialog mode="head" managers={managers}>
            <Button size="lg"><UserPlus />Add user</Button>
          </UserDialog>
        }
      />
      <AutoSubmitForm className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
        <Input type="search" name="q" defaultValue={sp.q} placeholder="Search name or email…" className="lg:w-64" />
        <NativeSelect name="role" defaultValue={role ?? ""} className="lg:w-48" aria-label="Role">
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </NativeSelect>
        <NativeSelect name="team" defaultValue={sp.team ?? ""} className="lg:w-56" aria-label="Team">
          <option value="">All teams</option>
          {managers.map((m) => <option key={m.id} value={m.id}>{m.name}&apos;s team</option>)}
        </NativeSelect>
        <NativeSelect name="skill" defaultValue={sp.skill ?? ""} className="lg:w-52" aria-label="Skill">
          <option value="">Any skill</option>
          {skills.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
        </NativeSelect>
        <NativeSelect name="inactive" defaultValue={sp.inactive ?? ""} className="lg:w-44" aria-label="Show">
          <option value="">Active only</option>
          <option value="1">Include inactive</option>
        </NativeSelect>
        {filtered && <Button variant="ghost" size="sm" asChild><Link href="/users">Clear</Link></Button>}
      </AutoSubmitForm>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="No users match these filters" />
      ) : (
        <section className="panel overflow-hidden">
          <SortableTable
            defaultSort={{ col: 1, dir: "asc" }}
            columns={[
              { label: "Name", className: "pl-6", cellClassName: "pl-6" },
              { label: "Role" },
              { label: "Team", cellClassName: "whitespace-nowrap text-sm text-muted-foreground" },
              { label: "Skills", cellClassName: "min-w-52" },
              { label: "Status" },
              { label: "Added", firstDir: "desc", cellClassName: "whitespace-nowrap text-sm text-muted-foreground tabular" },
              { label: "Actions", sortable: false, className: "pr-6 text-right", cellClassName: "pr-6 text-right" },
            ]}
            rows={rows.map((u) => {
              const team = u.role === "MANAGER" ? "Leads a team" : u.role === "HEAD" ? "—" : u.manager ? `${u.manager.name}'s team` : "—";
              return {
                id: u.id,
                className: u.isActive ? undefined : "opacity-60",
                sort: [u.name, order[u.role], team === "—" ? null : team, u.skillList.length ? u.skillList.join(", ") : null, u.isActive ? 0 : 1, u.createdAt.toISOString(), null],
                cells: [
                  <div key="n" className="flex items-center gap-3">
                    <Avatar name={u.name} className="size-9 text-[11px]" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{u.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{u.jobTitle ? `${u.jobTitle} · ` : ""}{u.email}</div>
                    </div>
                  </div>,
                  <RoleBadge key="r" role={u.role} />,
                  team,
                  <SkillChips key="s" skills={u.skillList} max={4} />,
                  u.isActive ? <Badge key="a" variant="custom" className="bg-[#dcf2e8] text-[#1f7a52] ring-transparent">Active</Badge> : <Badge key="a" variant="secondary">Inactive</Badge>,
                  formatDate(u.createdAt),
                  <div key="x" className="flex justify-end gap-1.5">
                    <SkillsDialog userId={u.id} name={u.name} skills={u.skillList} catalog={skillNames}>
                      <Button size="sm" variant="outline"><Sparkles />Skills</Button>
                    </SkillsDialog>
                    <UserDialog mode="head" user={u} managers={managers} isSelf={u.id === actor.id}>
                      <button type="button" className="icon-btn size-8" aria-label={`Edit ${u.name}`}><Pencil /></button>
                    </UserDialog>
                  </div>,
                ],
              };
            })}
          />
        </section>
      )}
    </>
  );
}
