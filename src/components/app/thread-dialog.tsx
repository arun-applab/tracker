"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/components/app/api-client";
import type { Thread } from "@/components/app/log-types";
import { TASK_TYPE_LABEL } from "@/lib/constants";
import { formatDate, formatHours } from "@/lib/dates";
import { cn } from "@/lib/utils";

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Comment thread on a time entry: managers ask, the owner answers. */
export function ThreadDialog({ logId, open, onOpenChange }: { logId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [thread, setThread] = useState<Thread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!logId) return;
    setError(null);
    try {
      setThread(await api<Thread>("GET", `/api/time-logs/${logId}/comments`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [logId]);

  useEffect(() => {
    if (open) {
      setThread(null);
      setMessage("");
      void load();
    }
  }, [open, load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!logId || !message.trim()) return;
    setSending(true);
    try {
      await api("POST", `/api/time-logs/${logId}/comments`, { message });
      setMessage("");
      await load();
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Entry discussion</DialogTitle>
          <DialogDescription>Ask about or clarify this time entry. Everyone who can see the entry sees the thread.</DialogDescription>
        </DialogHeader>
        {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {!thread && !error && (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {thread && (
          <>
            <div className="rounded-[20px] bg-surface-muted p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {thread.user.name} · <Link href={`/projects/${thread.project.id}`} className="hover:underline">{thread.project.name}</Link>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(thread.date)} · {TASK_TYPE_LABEL[thread.taskType]} · logged by {thread.loggedBy}
                  </p>
                </div>
                <span className="text-lg font-semibold tabular">{formatHours(thread.hours)}</span>
              </div>
              <p className="mt-2 text-sm">{thread.description}</p>
            </div>
            <ol className="max-h-[45dvh] space-y-3 overflow-y-auto pr-1">
              {thread.comments.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">No comments yet. Start the conversation below.</li>}
              {thread.comments.map((c) => (
                <li key={c.id} className={cn("flex items-end gap-2", c.mine && "flex-row-reverse")}>
                  <Avatar name={c.author.name} className="size-7 text-[10px]" />
                  <div className={cn("max-w-[80%] rounded-[18px] px-3.5 py-2.5", c.mine ? "rounded-br-md bg-ink text-white" : "rounded-bl-md bg-surface-muted")}>
                    <p className={cn("mb-0.5 text-[11px]", c.mine ? "text-white/60" : "text-muted-foreground")}>
                      {c.mine ? "You" : c.author.name} · {fmt.format(new Date(c.createdAt))}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{c.message}</p>
                  </div>
                </li>
              ))}
            </ol>
            {thread.canComment && (
              <form onSubmit={send} className="flex items-end gap-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write a comment…"
                  rows={2}
                  className="min-h-12 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e);
                  }}
                />
                <Button type="submit" size="icon" disabled={sending || !message.trim()} aria-label="Send comment">
                  {sending ? <Loader2 className="animate-spin" /> : <Send />}
                </Button>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
