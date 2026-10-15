"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/components/app/api-client";
import { AVAILABILITY, AVAILABILITY_STATUSES, type AvailabilityStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * One-click availability. Used in the top bar for your own status, and in team
 * tables for managers (compact). "Automatic" follows active projects.
 */
export function StatusSwitch({
  userId,
  status,
  autoStatus,
  overridden,
  compact = false,
  label,
}: {
  userId: string;
  status: AvailabilityStatus;
  autoStatus: AvailabilityStatus;
  overridden: boolean;
  compact?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function set(value: AvailabilityStatus | null) {
    setSaving(true);
    try {
      await api("PUT", `/api/users/${userId}/availability`, { override: value });
      toast.success(value ? `Status: ${AVAILABILITY[value].label}` : `Status follows projects (${AVAILABILITY[autoStatus].label})`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/[0.06] bg-white/90 font-medium shadow-[0_1px_2px_rgba(20,22,27,0.06)] outline-none transition hover:bg-white focus-visible:ring-[3px] focus-visible:ring-ring/50",
          compact ? "h-8 px-3 text-xs" : "h-11 px-4 text-sm",
        )}
        aria-label={label ?? "Set availability"}
      >
        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <span className={cn("size-2.5 rounded-full", AVAILABILITY[status].dot)} />}
        <span className={cn(!compact && "hidden sm:inline")}>{AVAILABILITY[status].label}</span>
        {overridden && !compact && <span className="hidden text-xs font-normal text-muted-foreground xl:inline">· manual</span>}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{label ?? "Your availability"}</DropdownMenuLabel>
        {AVAILABILITY_STATUSES.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => set(s)}>
            <span className={cn("size-2.5 rounded-full", AVAILABILITY[s].dot)} />
            <span className="flex-1">{AVAILABILITY[s].label}</span>
            {overridden && status === s && <Check className="text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => set(null)}>
          <Sparkles />
          <span className="flex-1">
            Automatic
            <span className="block text-xs text-muted-foreground">From active projects: {AVAILABILITY[autoStatus].label}</span>
          </span>
          {!overridden && <Check className="text-muted-foreground" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
