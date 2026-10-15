"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/components/app/api-client";
import type { LogFormOptions, LogRow } from "@/components/app/log-types";
import { BACKDATE_LIMIT_DAYS, MAX_HOURS_PER_DAY, TASK_TYPES, TASK_TYPE_LABEL, type TaskType } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Defaults = { projectId?: string; userId?: string; date?: string };

const QUICK_HOURS = [0.5, 1, 2, 4, 8];

export function TimeLogDialog({
  options,
  log,
  defaults,
  currentUserId,
  children,
}: {
  options: LogFormOptions;
  log?: LogRow; // present = edit mode
  defaults?: Defaults;
  currentUserId?: string;
  children: React.ReactNode; // trigger
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isManager = options.mode === "manager";

  const initial = () => ({
    forWhom: (defaults?.userId ? "member" : "self") as "self" | "member",
    projectId: log?.project.id ?? defaults?.projectId ?? "",
    userId: log?.user.id ?? defaults?.userId ?? "",
    date: log?.date ?? defaults?.date ?? options.today,
    hours: log ? String(log.hours) : "",
    taskType: (log?.taskType ?? "DESIGN") as TaskType,
    description: log?.description ?? "",
    override: false,
  });
  const [form, setForm] = useState(initial);
  const set = <K extends keyof ReturnType<typeof initial>>(k: K, v: ReturnType<typeof initial>[K]) => setForm((f) => ({ ...f, [k]: v }));

  const editing = !!log;
  const editingOthers = editing && !!currentUserId && log.user.id !== currentUserId;
  const forMember = isManager && !editing && form.forWhom === "member";

  const projectChoices = useMemo(() => {
    let list: { id: string; name: string }[];
    if (options.mode === "self") list = options.projects;
    else if (editingOthers) list = options.projects.map((p) => ({ id: p.id, name: p.name }));
    else if (forMember) list = options.projects.filter((p) => !p.closed && p.people.length).map((p) => ({ id: p.id, name: p.name }));
    else list = options.ownProjects;
    if (log && !list.some((p) => p.id === log.project.id)) list = [{ id: log.project.id, name: `${log.project.name} (closed)` }, ...list];
    return list;
  }, [options, log, editingOthers, forMember]);

  const people = options.mode === "manager" ? (options.projects.find((p) => p.id === form.projectId)?.people ?? []) : [];
  const allowOld = isManager && form.override && (forMember || editingOthers);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const hours = Number(form.hours);
    if (!form.projectId) return setError("Choose a project.");
    if (forMember && !form.userId) return setError("Choose a team member.");
    if (!hours || hours <= 0 || !Number.isInteger(hours * 2)) return setError("Hours must be in 0.5 steps.");
    if (!form.description.trim()) return setError("Task description is required.");
    setSaving(true);
    try {
      const body = {
        projectId: form.projectId,
        date: form.date,
        hours,
        taskType: form.taskType,
        description: form.description.trim(),
        overrideBackdate: allowOld || undefined,
        ...(forMember && { userId: form.userId }),
      };
      if (editing) await api("PATCH", `/api/time-logs/${log.id}`, body);
      else await api("POST", "/api/time-logs", body);
      toast.success(editing ? "Entry updated" : "Time logged");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setForm(initial());
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit time entry" : "Add time"}</DialogTitle>
          <DialogDescription>
            {editingOthers ? `Editing ${log.user.name}'s entry.` : `You can edit or delete your entries for ${BACKDATE_LIMIT_DAYS} days.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          {isManager && !editing && (
            <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-muted p-1" role="radiogroup" aria-label="Log time for">
              {(["self", "member"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={form.forWhom === w}
                  onClick={() => setForm((f) => ({ ...f, forWhom: w, projectId: "", userId: "" }))}
                  className={cn("h-9 cursor-pointer rounded-full text-sm font-medium transition", form.forWhom === w ? "bg-ink text-white shadow" : "text-foreground/70 hover:text-foreground")}
                >
                  {w === "self" ? "My time" : "A team member"}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="tl-project">Project</Label>
            {projectChoices.length ? (
              <NativeSelect id="tl-project" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, userId: editing ? f.userId : "" }))} required>
                <option value="">Select a project…</option>
                {projectChoices.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </NativeSelect>
            ) : (
              <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
                {forMember ? "None of your team members are onboarded to an open project yet." : "You aren't assigned to any open projects yet."}
              </p>
            )}
          </div>

          {forMember && (
            <div className="grid gap-2">
              <Label htmlFor="tl-person">Mid designer</Label>
              <NativeSelect id="tl-person" value={form.userId} onChange={(e) => set("userId", e.target.value)} disabled={!form.projectId} required>
                <option value="">{form.projectId ? "Select a person…" : "Choose a project first"}</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </NativeSelect>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="tl-date">Date</Label>
              <Input id="tl-date" type="date" value={form.date} max={options.today} min={allowOld ? undefined : options.minDate} onChange={(e) => set("date", e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tl-hours">Hours</Label>
              <Input id="tl-hours" type="number" inputMode="decimal" step={0.5} min={0.5} max={MAX_HOURS_PER_DAY} value={form.hours} onChange={(e) => set("hours", e.target.value)} placeholder="e.g. 2.5" required />
            </div>
          </div>
          <div className="-mt-2 flex flex-wrap gap-1.5">
            {QUICK_HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => set("hours", String(h))}
                className={cn(
                  "tabular h-8 cursor-pointer rounded-full border border-black/[0.06] bg-white px-3 text-xs font-medium transition hover:bg-surface-muted",
                  Number(form.hours) === h && "border-transparent bg-ink text-white ",
                )}
              >
                {h}h
              </button>
            ))}
          </div>

          {isManager && (forMember || editingOthers) && (
            <label className="-mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={form.override} onCheckedChange={(v) => set("override", v === true)} />
              Override the {BACKDATE_LIMIT_DAYS}-day backdate limit
            </label>
          )}

          <div className="grid gap-2">
            <Label htmlFor="tl-type">Task type</Label>
            <NativeSelect id="tl-type" value={form.taskType} onChange={(e) => set("taskType", e.target.value as TaskType)}>
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>{TASK_TYPE_LABEL[t]}</option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tl-desc">Task description</Label>
            <Textarea id="tl-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What did you work on?" required rows={3} />
          </div>

          {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !projectChoices.length}>
              {saving && <Loader2 className="animate-spin" />}
              {editing ? "Save changes" : "Log time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
