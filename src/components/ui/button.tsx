import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-ink text-primary-foreground shadow-sm hover:brightness-110",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90",
        outline: "border border-black/[0.06] bg-white/90 shadow-[0_1px_2px_rgba(20,22,27,0.06)] hover:bg-white",
        secondary: "bg-brand-soft text-[#3550b8] hover:bg-brand-soft/80",
        ghost: "hover:bg-white/70",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-emerald-600 text-white shadow-xs hover:bg-emerald-600/90",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 gap-1.5 px-3.5 text-[13px]",
        xs: "h-7 gap-1 px-2.5 text-xs",
        lg: "h-11 px-6 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
