"use client";

import { useMemo, useState } from "react";
import { Lock, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { BorrowedTag, SkillChips } from "@/components/app/badges";
import { ROLE_LABEL, type Role } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type Onboardable = {
  id: string;
  name: string;
  role: Role;
  jobTitle: string | null;
  managerId: string | null;
  managerName: string;
  own: boolean;
  skills: string[];
  /** Already on the project via another manager — shown, not changeable here. */
  lockedBy: string | null;
};

/** Your team first, then every other team (selecting borrows them). Searchable by name, title or skill. */
export function MemberPicker({ people, value, onChange, headView = false }: { people: Onboardable[]; value: string[]; onChange: (ids: string[]) => void; headView?: boolean }) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (p: Onboardable) =>
      !needle || p.name.toLowerCase().includes(needle) || (p.jobTitle ?? "").toLowerCase().includes(needle) || p.skills.some((s) => s.toLowerCase().includes(needle)) || p.managerName.toLowerCase().includes(needle);
    const map = new Map<string, { label: string; own: boolean; people: Onboardable[] }>();
    for (const p of people.filter(match)) {
      const key = p.managerId ?? "none";
      if (!map.has(key)) map.set(key, { label: p.own && !headView ? "Your team" : `${p.managerName}'s team`, own: p.own, people: [] });
      map.get(key)!.people.push(p);
    }
    return [...map.values()];
  }, [people, q, headView]);

  const toggle = (id: string, on: boolean) => onChange(on ? [...new Set([...value, id])] : value.filter((v) => v !== id));
  const borrowedCount = people.filter((p) => !p.own && value.includes(p.id)).length;

  return (
    <div className="overflow-hidden rounded-[22px] bg-surface-muted">
      <div className="flex items-center gap-2 p-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, title, skill or team…" className="h-9 pl-9" />
        </div>
        <span className="px-2 text-xs text-muted-foreground">
          {value.length} selected{!headView && borrowedCount > 0 && ` · ${borrowedCount} borrowed`}
        </span>
      </div>
      <div className="max-h-[50dvh] overflow-y-auto px-2 pb-2">
        {people.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No one available to onboard.</p>}
        {people.length > 0 && groups.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No one matches “{q}”.</p>}
        {groups.map((g) => (
          <div key={g.label}>
            <p className="flex items-center justify-between px-3 pb-1 pt-3 text-xs font-medium text-muted-foreground">
              {g.label}
              {!g.own && !headView && <span className="font-normal">Selecting borrows them for this project</span>}
            </p>
            {g.people.map((p) => {
              const checked = !!p.lockedBy || value.includes(p.id);
              return (
                <label key={p.id} className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5", p.lockedBy ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-white")}>
                  <Checkbox checked={checked} disabled={!!p.lockedBy} onCheckedChange={(v) => toggle(p.id, v === true)} />
                  <Avatar name={p.name} className="size-8 text-[10px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.lockedBy ? (
                        <span className="inline-flex items-center gap-1"><Lock className="size-3" />On the project via {p.lockedBy}</span>
                      ) : (
                        (p.jobTitle ?? ROLE_LABEL[p.role])
                      )}
                    </span>
                  </span>
                  {!p.own && !headView && checked && !p.lockedBy ? (
                    <BorrowedTag managerName={p.managerName} short />
                  ) : (
                    <SkillChips skills={p.skills} max={2} className="hidden justify-end sm:flex" />
                  )}
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
