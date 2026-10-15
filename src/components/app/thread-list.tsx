"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ThreadDialog } from "@/components/app/thread-dialog";
import { formatHours, formatShortDate } from "@/lib/dates";

type OpenThread = { id: string; date: string; hours: number; user: { id: string; name: string }; project: { id: string; name: string }; lastMessage: string; lastAuthor: string };

export function ThreadList({ threads, empty }: { threads: OpenThread[]; empty: string }) {
  const [active, setActive] = useState<string | null>(null);
  if (!threads.length) {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-white/50 px-4 py-4 text-sm text-muted-foreground">
        <MessageCircle className="size-4" /> {empty}
      </p>
    );
  }
  return (
    <>
      <ul className="space-y-2">
        {threads.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => setActive(t.id)} className="tile flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition hover:bg-white">
              <Avatar name={t.lastAuthor} className="size-8 text-[10px]" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{t.lastAuthor}</span>
                  <span className="size-2 shrink-0 rounded-full bg-[#e26d6d]" aria-label="Waiting for you" />
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {t.project.name} · {t.user.name} · {formatShortDate(t.date)} · {formatHours(t.hours)}
                </span>
                <span className="mt-1 line-clamp-2 block text-[13px]">{t.lastMessage}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <ThreadDialog logId={active} open={!!active} onOpenChange={(o) => !o && setActive(null)} />
    </>
  );
}
