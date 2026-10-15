"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { ArrowLeft, CalendarCheck2, Clock, FolderKanban, KeyRound, Layers, LogOut, MessageSquareText, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordDialog } from "@/components/app/change-password-dialog";
import { NotificationBell } from "@/components/app/notification-bell";
import { StatusSwitch } from "@/components/app/status-switch";
import { TimeLogDialog } from "@/components/app/time-log-dialog";
import type { LogFormOptions } from "@/components/app/log-types";
import { ROLE_LABEL, type AvailabilityStatus, type Role } from "@/lib/constants";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; badge?: number };

function navFor(role: Role, badges: { suggestions: number }): NavItem[] {
  if (role === "ASSOCIATE_DESIGNER" || role === "MID_DESIGNER") {
    return [
      { href: "/", label: "Dashboard" },
      { href: "/projects", label: "My Projects" },
      { href: "/timesheet", label: "My Timesheet" },
    ];
  }
  if (role === "MANAGER") {
    return [
      { href: "/", label: "Dashboard" },
      { href: "/projects", label: "Projects" },
      { href: "/timesheet", label: "My Timesheet" },
      { href: "/time-logs", label: "Time Logs" },
      { href: "/availability", label: "Availability" },
      { href: "/team", label: "My Team" },
      { href: "/suggestions", label: "Suggestions", badge: badges.suggestions },
    ];
  }
  return [
    { href: "/", label: "Dashboard" },
    { href: "/projects", label: "Projects" },
    { href: "/time-logs", label: "Time Logs" },
    { href: "/availability", label: "Availability" },
    { href: "/users", label: "Users & Skills" },
    { href: "/suggestions", label: "Suggestions", badge: badges.suggestions },
  ];
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Design Tracker home">
      <Layers className="size-7" strokeWidth={2.2} />
      <span className="text-[22px] font-medium tracking-tight">
        applab<span className="text-muted-foreground">design</span>
      </span>
    </Link>
  );
}

function PillNav({ items, pathname, className }: { items: NavItem[]; pathname: string; className?: string }) {
  return (
    <nav className={cn("flex items-center gap-1", className)} aria-label="Main">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] transition-colors xl:px-5",
              active ? "bg-ink font-medium text-white shadow-md" : "text-foreground/80 hover:bg-white/70 hover:text-foreground",
            )}
          >
            {item.label}
            {!!item.badge && (
              <span className={cn("tabular min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none", active ? "bg-white text-[#1154ed]" : "bg-[#e26d6d] text-white")}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function RailButton({ href, label, children, active, badge }: { href: string; label: string; children: React.ReactNode; active?: boolean; badge?: number }) {
  return (
    <Link href={href} title={label} aria-label={label} className={cn("icon-btn relative size-11", active && "bg-ink text-white hover:text-white")}>
      {children}
      {!!badge && <span className="absolute right-0.5 top-0.5 size-2.5 rounded-full bg-[#e26d6d] ring-2 ring-white" />}
    </Link>
  );
}

export function AppShell({
  user,
  badges,
  logOptions,
  myStatus,
  notifications,
  vapidPublicKey,
  children,
}: {
  user: { id: string; name: string; email: string; role: Role; teamLabel?: string | null; skills: string[] };
  badges: { suggestions: number };
  logOptions?: LogFormOptions;
  myStatus: { status: AvailabilityStatus; autoStatus: AvailabilityStatus; overridden: boolean } | null;
  notifications: Parameters<typeof NotificationBell>[0]["initial"];
  vapidPublicKey: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = navFor(user.role, badges);
  const leader = user.role === "HEAD" || user.role === "MANAGER";
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/50 bg-[#e6eaf1]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <Brand />
          <div className="flex flex-1 justify-center">
            <PillNav items={items} pathname={pathname} className="hidden lg:flex" />
          </div>
          <div className="flex items-center gap-2">
            {myStatus && <StatusSwitch userId={user.id} {...myStatus} />}
            <NotificationBell initial={notifications} vapidPublicKey={vapidPublicKey} />
            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-label="Account menu">
                <Avatar name={user.name} className="size-11 text-sm shadow-sm" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <span className="block font-semibold">{user.name}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{user.email}</span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {ROLE_LABEL[user.role]}
                    {user.teamLabel ? ` · ${user.teamLabel}` : ""}
                  </span>
                  {user.skills.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-1">
                      {user.skills.map((s) => (
                        <span key={s} className="rounded-full bg-[#eef1f6] px-2 py-0.5 text-[11px] font-medium text-foreground/70">{s}</span>
                      ))}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
                  <KeyRound />
                  Change password
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* Compact nav for tablet / phone */}
        <div className="overflow-x-auto px-3 pb-3 lg:hidden [scrollbar-width:none]">
          <PillNav items={items} pathname={pathname} className="w-max" />
        </div>
      </header>

      {/* Left icon rail (desktop) */}
      <aside className="fixed bottom-6 left-4 top-[100px] z-20 hidden w-12 flex-col items-center gap-3 lg:flex">
        <button type="button" onClick={() => router.back()} className="icon-btn size-11" title="Back" aria-label="Back">
          <ArrowLeft />
        </button>
        <div className="my-1 h-px w-6 bg-black/10" />
        {logOptions && (
          <TimeLogDialog options={logOptions}>
            <button type="button" className="icon-btn size-11" title="Add time" aria-label="Add time">
              <Plus />
            </button>
          </TimeLogDialog>
        )}
        <RailButton href="/projects" label="Projects" active={isActive(pathname, "/projects")}>
          <FolderKanban />
        </RailButton>
        {user.role !== "HEAD" && (
          <RailButton href="/timesheet" label="My Timesheet" active={isActive(pathname, "/timesheet")}>
            <Clock />
          </RailButton>
        )}
        {leader && (
          <RailButton href="/availability" label="Availability" active={isActive(pathname, "/availability")}>
            <CalendarCheck2 />
          </RailButton>
        )}
        {leader && (
          <RailButton href="/suggestions" label="Suggestions" active={isActive(pathname, "/suggestions")} badge={badges.suggestions}>
            <MessageSquareText />
          </RailButton>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-ink text-white shadow-md transition hover:brightness-110 [&_svg]:size-[18px]"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut />
        </button>
      </aside>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:pl-24 lg:pr-8">{children}</main>
    </div>
  );
}
