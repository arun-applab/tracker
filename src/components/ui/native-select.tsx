import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Styled native <select>: works without JS and is the friendliest picker on mobile. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        data-slot="native-select"
        className="h-10 w-full appearance-none rounded-full border border-black/[0.06] bg-white/90 pl-4 pr-9 text-sm shadow-[0_1px_2px_rgba(20,22,27,0.05)] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { NativeSelect };
