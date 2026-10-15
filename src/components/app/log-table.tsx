"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Clock, Loader2, Lock, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/components/app/api-client";
import { EmptyState } from "@/components/app/empty-state";
import type { LogFormOptions, LogRow } from "@/components/app/log-types";
import { SortHeaderButton, useSort, type SortDir, type SortValue } from "@/components/app/sortable-table";
import { ThreadDialog } from "@/components/app/thread-dialog";
import { TimeLogDialog } from "@/components/app/time-log-dialog";
import { BACKDATE_LIMIT_DAYS, ROLE_LABEL, TASK_TYPE_LABEL } from "@/lib/constants";
import { formatDate, formatHours } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Props = {
  logs: LogRow[];
  currentUserId: string;
  showPerson?: boolean;
  showProject?: boolean;
  editOptions?: LogFormOptions;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
};

type Col = "date" | "person" | "project" | "task" | "hours" | "loggedBy" | "discussion";
const FIRST_DIR: Record<Col, SortDir> = { date: "desc", person: "asc", project: "asc", task: "asc", hours: "desc", loggedBy: "asc", discussion: "desc" };
const COL_INDEX: Col[] = ["date", "person", "project", "task", "hours", "loggedBy", "discussion"];

function valueOf(l: LogRow, col: Col): SortValue {
  switch (col) {
    case "date":
      return l.date;
    case "person":
      return l.user.name;
    case "project":
      return l.project.name;
    case "task":
      return TASK_TYPE_LABEL[l.taskType];
    case "hours":
      return l.hours;
    case "loggedBy":
      return l.loggedBySelf ? "" : l.loggedBy.name;
    case "discussion":
      return (l.awaitingMe ? 1000 : 0) + l.commentCount;
  }
}

export function LogTable({
  logs,
  currentUserId,
  showPerson = true,
  showProject = true,
  editOptions,
  emptyTitle = "No time entries",
  emptyDescription = "Nothing matches these filters yet.",
  emptyAction,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<LogRow | null>(null);
  const [thread, setThread] = useState<string | null>(null);
  // Newest first by default; click a header to sort by it. Ties keep the server order (latest logged first).
  const { sorted, sort, toggle } = useSort(logs, (l, i) => valueOf(l, COL_INDEX[i]), { col: 0, dir: "desc" });
  const head = (col: Col, label: string, align?: "right") => {
    const i = COL_INDEX.indexOf(col);
    return <SortHeaderButton label={label} active={sort.col === i} dir={sort.dir} onClick={() => toggle(i, FIRST_DIR[col])} align={align} />;
  };

  async function remove(log: LogRow) {
    setBusy(true);
    try {
      await api("DELETE", `/api/time-logs/${log.id}`);
      toast.success("Entry deleted");
      setDeleting(null);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!logs.length) return <EmptyState icon={Clock} title={emptyTitle} description={emptyDescription} action={emptyAction} />;

  return (
    <>
      <div className="tile overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">{head("date", "Date")}</TableHead>
              {showPerson && <TableHead>{head("person", "Person")}</TableHead>}
              {showProject && <TableHead>{head("project", "Project")}</TableHead>}
              <TableHead>{head("task", "Task")}</TableHead>
              <TableHead className="text-right">{head("hours", "Hours", "right")}</TableHead>
              <TableHead>{head("loggedBy", "Logged by")}</TableHead>
              <TableHead className="pr-5 text-right">{head("discussion", "Discussion & actions", "right")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap pl-5 tabular">{formatDate(l.date)}</TableCell>
                {showPerson && (
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={l.user.name} className="size-8 text-[10px]" />
                      <div>
                        <div className="font-medium">{l.user.name}</div>
                        <div className="text-xs text-muted-foreground">{ROLE_LABEL[l.user.role]}</div>
                      </div>
                    </div>
                  </TableCell>
                )}
                {showProject && (
                  <TableCell className="max-w-52">
                    <Link href={`/projects/${l.project.id}`} className="line-clamp-2 font-medium hover:underline">{l.project.name}</Link>
                  </TableCell>
                )}
                <TableCell className="min-w-56 max-w-md">
                  <div className="text-xs font-medium text-muted-foreground">{TASK_TYPE_LABEL[l.taskType]}</div>
                  <div className="line-clamp-2">{l.description}</div>
                </TableCell>
                <TableCell className="text-right text-[15px] font-semibold tabular">{formatHours(l.hours)}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {l.loggedBySelf ? <span className="text-muted-foreground">Self</span> : <span>{l.loggedBy.name} <span className="text-xs text-muted-foreground">(manager)</span></span>}
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {(l.canComment || l.commentCount > 0) && (
                      <button
                        type="button"
                        onClick={() => setThread(l.id)}
                        className={cn(
                          "relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium transition",
                          l.awaitingMe ? "bg-[#fde2e1] text-[#b23b3b] hover:bg-[#fbd2d0]" : l.commentCount ? "bg-brand-soft text-[#3550b8] hover:bg-[#d6defa]" : "bg-surface-muted text-muted-foreground hover:text-foreground",
                        )}
                        title={l.awaitingMe ? "New comment — waiting for your reply" : l.commentCount ? "Open discussion" : "Ask a question or add a note"}
                      >
                        <MessageCircle className="size-3.5" />
                        {l.commentCount || (l.user.id === currentUserId ? "Note" : "Ask")}
                        {l.awaitingMe && <span className="size-1.5 rounded-full bg-[#e26d6d]" />}
                      </button>
                    )}
                    {l.canEdit && editOptions && (
                      <TimeLogDialog options={editOptions} log={l} currentUserId={currentUserId}>
                        <Button size="icon-sm" variant="ghost" title="Edit">
                          <Pencil />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </TimeLogDialog>
                    )}
                    {l.canDelete && (
                      <Button size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-rose-700" title="Delete" onClick={() => setDeleting(l)}>
                        <Trash2 />
                        <span className="sr-only">Delete</span>
                      </Button>
                    )}
                    {!l.canEdit && l.user.id === currentUserId && (
                      <span className="inline-flex items-center gap-1 px-1 text-xs text-muted-foreground" title={`Entries older than ${BACKDATE_LIMIT_DAYS} days can only be changed by your Design Manager`}>
                        <Lock className="size-3" />
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ThreadDialog logId={thread} open={!!thread} onOpenChange={(o) => !o && setThread(null)} />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
            <DialogDescription>{deleting && `${formatHours(deleting.hours)} on ${deleting.project.name}, ${formatDate(deleting.date)}. Its comments are deleted too. This can't be undone.`}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={busy} onClick={() => deleting && remove(deleting)}>
              {busy && <Loader2 className="animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
