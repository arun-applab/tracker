"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/components/app/api-client";
import { PanelHeader } from "@/components/app/page-header";
import { PRIORITIES, PRIORITY, PROJECT_STATUS, PROJECT_STATUSES, type Priority, type ProjectStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type ProjectFormValues = {
  name: string;
  client: string;
  description: string;
  startDate: string;
  eta: string;
  priority: Priority;
  status: ProjectStatus;
  managerIds: string[];
};

export type ManagerOption = { id: string; name: string; jobTitle: string | null; teamSize: number };

/**
 * Design Head: create / edit a project and assign Design Managers.
 * Design Manager ("request" mode): the project goes to the Head for approval; the requesting
 * manager is always on it and can add co-managers.
 */
export function ProjectForm({
  projectId,
  initial,
  managers,
  request,
}: {
  projectId?: string;
  initial: ProjectFormValues;
  managers: ManagerOption[];
  request?: { selfId: string; approval?: "PENDING" | "REJECTED" };
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ProjectFormValues>(k: K, val: ProjectFormValues[K]) => setV((s) => ({ ...s, [k]: val }));
  const removing = projectId ? initial.managerIds.filter((m) => !v.managerIds.includes(m)) : [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (v.eta < v.startDate) return setError("ETA can't be before the start date.");
    setSaving(true);
    try {
      const res = projectId ? await api<{ id: string }>("PATCH", `/api/projects/${projectId}`, v) : await api<{ id: string }>("POST", "/api/projects", v);
      toast.success(
        request
          ? !projectId
            ? "Sent to the Design Head for approval"
            : request.approval === "REJECTED"
              ? "Resubmitted for approval"
              : "Request updated"
          : projectId
            ? "Project updated"
            : "Project created",
      );
      router.push(`/projects/${res.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="panel pb-6">
        <PanelHeader title="Project details" />
        <div className="grid gap-4 px-6 pt-5">
          <div className="grid gap-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" value={v.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client">Client</Label>
            <Input id="client" value={v.client} onChange={(e) => set("client", e.target.value)} required maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={v.description} onChange={(e) => set("description", e.target.value)} rows={4} placeholder="Scope, goals and anything the team should know. Figma links are added on the project page." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="start">Start date</Label>
              <Input id="start" type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="eta">ETA</Label>
              <Input id="eta" type="date" value={v.eta} min={v.startDate} onChange={(e) => set("eta", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <NativeSelect id="priority" value={v.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" value={v.status} onChange={(e) => set("status", e.target.value as ProjectStatus)}>
                {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{PROJECT_STATUS[s].label}</option>)}
              </NativeSelect>
            </div>
          </div>
        </div>
      </section>

      <section className="panel pb-6">
        <PanelHeader
          title={request ? "Design Managers" : "Assign Design Managers"}
          description={request ? "You're on this project. Add co-managers if another team leads part of it." : "Each manager then onboards people from their own team."}
        />
        <div className="grid gap-2 px-6 pt-5">
          {managers.length === 0 && <p className="text-sm text-muted-foreground">No active Design Managers yet.</p>}
          {managers.map((m) => {
            const locked = request?.selfId === m.id;
            const on = locked || v.managerIds.includes(m.id);
            return (
              <button
                type="button"
                key={m.id}
                aria-pressed={on}
                disabled={locked}
                title={locked ? "You're always on your own request" : undefined}
                onClick={() => set("managerIds", on ? v.managerIds.filter((x) => x !== m.id) : [...v.managerIds, m.id])}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[20px] px-3 py-2.5 text-left transition disabled:cursor-default",
                  on ? "bg-ink text-white shadow-md" : "bg-white/80 hover:bg-white",
                )}
              >
                <Avatar name={m.name} className="size-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{m.name}{locked && " (you)"}</span>
                  <span className={cn("block truncate text-xs", on ? "text-white/60" : "text-muted-foreground")}>
                    {m.jobTitle ?? "Design Manager"} · {m.teamSize} in team
                  </span>
                </span>
                <span className={cn("flex size-6 items-center justify-center rounded-full", on ? "bg-white text-[#1154ed]" : "border border-black/10")}>
                  {on && <Check className="size-3.5" />}
                </span>
              </button>
            );
          })}
          {removing.length > 0 && (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Removing a manager also removes the people they onboarded. Hours already logged are kept.
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end lg:col-span-2">
        {request && !error && (
          <p className="mr-auto text-sm text-muted-foreground">
            The Design Head reviews requests. Once approved you can onboard designers and they can log time.
          </p>
        )}
        {error && <p className="mr-auto rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p>}
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {request
            ? !projectId
              ? "Send for approval"
              : request.approval === "REJECTED"
                ? "Resubmit for approval"
                : "Save request"
            : projectId
              ? "Save changes"
              : "Create project"}
        </Button>
      </div>
    </form>
  );
}
