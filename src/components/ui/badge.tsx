import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium leading-none ring-1 ring-inset [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-brand-soft text-[#3550b8] ring-transparent",
        secondary: "bg-white/80 text-secondary-foreground ring-black/[0.06]",
        outline: "bg-transparent text-foreground ring-border",
        destructive: "bg-rose-50 text-rose-700 ring-rose-200",
        custom: "",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
