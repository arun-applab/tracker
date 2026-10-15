"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThreadDialog } from "@/components/app/thread-dialog";
import { formatShortDate, formatHours } from "@/lib/dates";

type OpenThread = { id: string; date: string; hours: number; user: { id: string; name: string }; project: { id: string; name: string }; lastMessage: string; lastAuthor: string; lastAt: string };

/** Bell with time-entry threads waiting for your reply. */
export function InboxBell({ threads }: { threads: OpenThread[] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="icon-btn relative size-11" aria-label={`Comments waiting for you: ${threads.length}`}>
          <Bell />
          {threads.length > 0 && <span className="absolute right-1 top-1 size-2.5 rounded-full bg-[#e26d6d] ring-2 ring-white" />}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[340px] p-0">
          <div className="border-b border-black/[0.06] px-4 py-3">
            <p className="text-sm font-semibold">Waiting for your reply</p>
            <p className="text-xs text-muted-foreground">Comments on time entries</p>
          </div>
          {threads.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto p-1.5">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-start gap-3 rounded-2xl px-2.5 py-2.5 text-left hover:bg-surface-muted"
                    onClick={() => {
                      setActive(t.id);
                      setOpen(false);
                    }}
                  >
                    <Avatar name={t.lastAuthor} className="size-8 text-[10px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{t.lastAuthor}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.project.name} · {t.user.name} · {formatShortDate(t.date)} · {formatHours(t.hours)}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[13px]">{t.lastMessage}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>
      <ThreadDialog logId={active} open={!!active} onOpenChange={(o) => !o && setActive(null)} />
    </>
  );
}
