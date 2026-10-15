"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

/** GET filter form that updates the URL as soon as any field changes. */
export function AutoSubmitForm({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  function submit(form: HTMLFormElement) {
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (typeof v === "string" && v !== "") params.set(k, v);
    start(() => router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false }));
  }

  return (
    <form
      className={cn("transition-opacity", pending && "opacity-60", className)}
      onChange={(e) => {
        const t = e.target as HTMLElement;
        if (t instanceof HTMLInputElement && (t.type === "search" || t.type === "text")) return; // text waits for Enter/blur
        submit(e.currentTarget);
      }}
      onBlur={(e) => {
        const t = e.target as HTMLElement;
        if (t instanceof HTMLInputElement && (t.type === "search" || t.type === "text")) submit(e.currentTarget);
      }}
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      {children}
    </form>
  );
}
