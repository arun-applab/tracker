import { AlertTriangle, ArrowLeftRight, Hand, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AVAILABILITY,
  PRIORITY,
  PROJECT_STATUS,
  ROLE_LABEL,
  SUGGESTION_STATUS,
  type AvailabilityStatus,
  type Priority,
  type ProjectStatus,
  type Role,
  type SuggestionStatus,
} from "@/lib/constants";

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return <Badge variant="custom" className={cn(PROJECT_STATUS[status].badge, className)}>{PROJECT_STATUS[status].label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const m = PRIORITY[priority];
  return (
    <Badge variant="custom" className={m.badge}>
      <span aria-hidden className={cn("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </Badge>
  );
}

export function AvailabilityBadge({ status, overridden, setBy }: { status: AvailabilityStatus; overridden?: boolean; setBy?: string | null }) {
  const m = AVAILABILITY[status];
  const title = !overridden ? "Automatic — from active projects" : setBy === "self" ? "Set by themselves" : `Set by ${setBy ?? "manager"}`;
  return (
    <Badge variant="custom" className={m.badge} title={title}>
      {m.label}
      {overridden && (setBy === "self" ? <User aria-label="Set by themselves" /> : <Hand aria-label="Set by manager" />)}
    </Badge>
  );
}

export function SuggestionStatusBadge({ status }: { status: SuggestionStatus }) {
  const m = SUGGESTION_STATUS[status];
  return <Badge variant="custom" className={m.badge}>{m.label}</Badge>;
}

export function OverdueBadge() {
  return (
    <Badge variant="custom" className="bg-[#e26d6d] text-white ring-transparent">
      <AlertTriangle />
      Overdue
    </Badge>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge variant="custom" className={role === "MANAGER" || role === "HEAD" ? "bg-ink text-white ring-transparent" : "bg-white/80 text-foreground/75 ring-black/[0.06]"}>
      {ROLE_LABEL[role]}
    </Badge>
  );
}

export function SkillChips({ skills, max = 4, className }: { skills: string[]; max?: number; className?: string }) {
  if (!skills.length) return <span className="text-xs text-muted-foreground">No skills added</span>;
  const shown = skills.slice(0, max);
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {shown.map((s) => (
        <span key={s} className="rounded-full bg-[#eef1f6] px-2 py-0.5 text-[11px] font-medium text-foreground/70">
          {s}
        </span>
      ))}
      {skills.length > max && <span className="rounded-full px-1.5 py-0.5 text-[11px] text-muted-foreground" title={skills.slice(max).join(", ")}>+{skills.length - max}</span>}
    </div>
  );
}

export function BorrowedTag({ managerName, short }: { managerName: string; short?: boolean }) {
  return (
    <Badge variant="custom" className="bg-[#d9f0f5] text-[#1d6f84] ring-transparent" title={`Borrowed from ${managerName}'s team`}>
      <ArrowLeftRight />
      {short ? "Borrowed" : `Borrowed from ${managerName.split(" ")[0]}'s team`}
    </Badge>
  );
}
