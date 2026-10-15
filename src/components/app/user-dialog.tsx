"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/components/app/api-client";
import { ROLE_LABEL, type Role } from "@/lib/constants";

export type EditableUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string | null;
  managerId: string | null;
  isActive: boolean;
};

/**
 * Add / edit a person.
 *  - mode "head": any role, any team, activate/deactivate, reset password
 *  - mode "manager": Associate Designer / Team Member in your own team only
 */
export function UserDialog({
  mode,
  user,
  managers = [],
  isSelf = false,
  children,
}: {
  mode: "head" | "manager";
  user?: EditableUser;
  managers?: { id: string; name: string }[];
  isSelf?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blank = (): EditableUser & { password: string } => ({
    id: user?.id ?? "",
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "ASSOCIATE_DESIGNER",
    jobTitle: user?.jobTitle ?? "",
    managerId: user?.managerId ?? (managers[0]?.id ?? null),
    isActive: user?.isActive ?? true,
    password: "",
  });
  const [v, setV] = useState(blank);
  const set = <K extends keyof ReturnType<typeof blank>>(k: K, val: ReturnType<typeof blank>[K]) => setV((s) => ({ ...s, [k]: val }));
  const editing = !!user;
  const designer = v.role === "ASSOCIATE_DESIGNER" || v.role === "TEAM_MEMBER";
  const roles: Role[] = mode === "head" ? (isSelf ? ["HEAD"] : ["MANAGER", "ASSOCIATE_DESIGNER", "TEAM_MEMBER"]) : ["ASSOCIATE_DESIGNER", "TEAM_MEMBER"];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: v.name, email: v.email, role: v.role, jobTitle: v.jobTitle || null };
      if (mode === "head") {
        body.managerId = designer ? v.managerId : null;
        if (editing) body.isActive = v.isActive;
      }
      if (!editing || (mode === "head" && v.password)) body.password = v.password;
      if (editing) await api("PATCH", `/api/users/${user.id}`, body);
      else await api("POST", "/api/users", body);
      toast.success(editing ? "Saved" : `${v.name} added`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setV(blank()); setError(null); } }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${user.name}` : mode === "manager" ? "Add to your team" : "Add user"}</DialogTitle>
          <DialogDescription>
            {mode === "manager" ? "Associate Designers and Team Members have the same permissions; only the role label differs." : "Design Managers own a team. Associate Designers and Team Members report to one manager."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="u-name">Full name</Label>
            <Input id="u-name" value={v.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="u-email">Email</Label>
            <Input id="u-email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="u-role">Role</Label>
              <NativeSelect id="u-role" value={v.role} onChange={(e) => set("role", e.target.value as Role)} disabled={isSelf}>
                {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="u-title">Job title</Label>
              <Input id="u-title" value={v.jobTitle ?? ""} onChange={(e) => set("jobTitle", e.target.value)} placeholder="e.g. Illustrator" />
            </div>
          </div>
          {mode === "head" && designer && (
            <div className="grid gap-2">
              <Label htmlFor="u-manager">Reports to</Label>
              <NativeSelect id="u-manager" value={v.managerId ?? ""} onChange={(e) => set("managerId", e.target.value || null)} required>
                <option value="">Select a Design Manager…</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </NativeSelect>
            </div>
          )}
          {(!editing || mode === "head") && (
            <div className="grid gap-2">
              <Label htmlFor="u-pass">{editing ? "Reset password" : "Initial password"}</Label>
              <Input
                id="u-pass"
                type="password"
                autoComplete="new-password"
                value={v.password}
                onChange={(e) => set("password", e.target.value)}
                required={!editing}
                minLength={8}
                placeholder={editing ? "Leave blank to keep the current password" : "At least 8 characters"}
              />
            </div>
          )}
          {mode === "head" && editing && !isSelf && (
            <label className="flex items-center justify-between rounded-2xl bg-surface-muted px-4 py-3">
              <span>
                <span className="block text-sm font-medium">Active</span>
                <span className="block text-xs text-muted-foreground">Inactive users can&apos;t sign in. Their history is kept.</span>
              </span>
              <Switch checked={v.isActive} onCheckedChange={(c) => set("isActive", c)} />
            </label>
          )}
          {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {editing ? "Save" : "Add person"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
