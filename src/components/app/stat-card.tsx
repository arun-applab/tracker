import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  href?: string;
  tone?: "default" | "warn" | "danger" | "good" | "dark";
}) {
  const dark = tone === "dark";
  const body = (
    <div className={cn("h-full rounded-[24px] p-5 transition", dark ? "bg-ink text-white" : "panel", href && !dark && "hover:bg-white/80")}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-sm", dark ? "text-white/70" : "text-muted-foreground")}>{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-full",
              dark ? "bg-white/10 text-white" : tone === "danger" ? "bg-[#fde2e1] text-[#b23b3b]" : tone === "warn" ? "bg-amber-100 text-amber-700" : tone === "good" ? "bg-[#dcf2e8] text-[#1f7a52]" : "bg-white text-foreground/70 shadow-sm",
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="tabular mt-3 text-[32px] font-semibold leading-none tracking-tight">{value}</p>
      {hint && <p className={cn("mt-2 text-xs", dark ? "text-white/60" : "text-muted-foreground")}>{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-[24px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
      {body}
    </Link>
  ) : (
    body
  );
}
