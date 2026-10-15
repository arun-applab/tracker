"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Frame, Link2, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/components/app/api-client";
import { MemberPicker, type Onboardable } from "@/components/app/member-picker";
import { PROJECT_STATUS, PROJECT_STATUSES, type ProjectStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function StatusSelect({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  async function set(next: ProjectStatus) {
    if (next === status) return;
    setSaving(true);
    try {
      await api("POST", `/api/projects/${projectId}/status`, { status: next });
      toast.success(`Status changed to ${PROJECT_STATUS[next].label}`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", PROJECT_STATUS[status].badge)}
        aria-label="Change status"
      >
        {saving && <Loader2 className="size-4 animate-spin" />}
        {PROJECT_STATUS[status].label}
        <span className="text-xs opacity-70">▾</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Change status</DropdownMenuLabel>
        {PROJECT_STATUSES.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => set(s)}>
            <span className={cn("size-2.5 rounded-full", PROJECT_STATUS[s].dot)} />
            {PROJECT_STATUS[s].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Manager onboards people from their own team (Head: any assigned team). */
export function OnboardDialog({
  projectId,
  people,
  current,
  headView,
  trigger,
}: {
  projectId: string;
  people: Onboardable[];
  current: string[];
  headView?: boolean;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ids, setIds] = useState(current);
  const [saving, setSaving] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setIds(current); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <UserPlus />
            Onboard team
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Onboard team members</DialogTitle>
          <DialogDescription>
            {headView
              ? "Pick people from any team. Removing someone keeps the hours they've logged."
              : "Pick people from your team, or borrow from another team. Removing someone keeps the hours they've logged."}
          </DialogDescription>
        </DialogHeader>
        <MemberPicker people={people} value={ids} onChange={setIds} headView={headView} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await api("PUT", `/api/projects/${projectId}/members`, { memberIds: ids });
                toast.success("Team updated");
                setOpen(false);
                router.refresh();
              } catch (err) {
                toast.error((err as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type ProjectLinkView = { id: string; title: string; url: string; addedBy: string; addedAt: string; canDelete: boolean };

function figmaKind(url: string) {
  try {
    const seg = new URL(url).pathname.split("/").filter(Boolean)[0];
    return seg === "proto" ? "Prototype" : seg === "board" ? "FigJam" : seg === "slides" ? "Slides" : seg === "make" ? "Make" : "Design file";
  } catch {
    return "Figma";
  }
}

function embedUrl(url: string) {
  return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
}

/** Figma links in the project description: everyone on the project can view and add. */
export function FigmaLinks({ projectId, links, canAdd }: { projectId: string; links: ProjectLinkView[]; canAdd: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("POST", `/api/projects/${projectId}/links`, { url: url.trim(), title: title.trim() || undefined });
      toast.success("Figma link added");
      setOpen(false);
      setUrl("");
      setTitle("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api("DELETE", `/api/projects/${projectId}/links/${id}`);
      toast.success("Link removed");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Frame className="size-4" /> Figma files
        </p>
        {canAdd && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null); }}>
            <DialogTrigger asChild>
              <button type="button" className="icon-btn size-9" title="Add Figma link" aria-label="Add Figma link">
                <Plus />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a Figma link</DialogTitle>
                <DialogDescription>Paste a link to a Figma design, prototype or FigJam board. Everyone on the project can open it.</DialogDescription>
              </DialogHeader>
              <form onSubmit={add} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fl-url">Figma link</Label>
                  <Input id="fl-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.figma.com/design/…" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fl-title">Title (optional)</Label>
                  <Input id="fl-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hi-fi screens v2" maxLength={120} />
                </div>
                {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p>}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Add link</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {links.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/10 px-4 py-4 text-sm text-muted-foreground">
          No Figma links yet.{canAdd && " Add the main design file so everyone can find it."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {links.map((l) => (
            <li key={l.id} className="group flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(20,22,27,0.05)]">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-white">
                <Frame className="size-5" />
              </span>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium group-hover:underline">{l.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {figmaKind(l.url)} · {l.addedBy} · {l.addedAt}
                </span>
              </a>
              <button type="button" onClick={() => setPreview(l.url)} className="hidden cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground sm:block">
                Preview
              </button>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="icon-btn size-8" title="Open in Figma" aria-label={`Open ${l.title} in Figma`}>
                <ExternalLink />
              </a>
              {l.canDelete && (
                <button type="button" onClick={() => remove(l.id)} className="icon-btn size-8 hover:text-rose-700" title="Remove link" aria-label={`Remove ${l.title}`}>
                  <Trash2 />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Link2 className="size-4" />Figma preview</DialogTitle>
            <DialogDescription>You may need to be signed in to Figma with access to this file.</DialogDescription>
          </DialogHeader>
          {preview && <iframe title="Figma preview" src={embedUrl(preview)} className="h-[70dvh] w-full rounded-2xl border-0 bg-surface-muted" allowFullScreen />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
