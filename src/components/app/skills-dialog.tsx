"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/components/app/api-client";
import { cn } from "@/lib/utils";

/** Design Head: edit someone's skills as tags (with suggestions from existing skills). */
export function SkillsDialog({ userId, name, skills, catalog, children }: { userId: string; name: string; skills: string[]; catalog: string[]; children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string[]>(skills);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const has = (s: string) => value.some((v) => v.toLowerCase() === s.toLowerCase());
  const add = (raw: string) => {
    const s = raw.trim().replace(/\s+/g, " ");
    if (s && !has(s) && s.length <= 40) setValue((v) => [...v, s]);
    setDraft("");
  };
  const suggestions = catalog.filter((c) => !has(c) && (!draft || c.toLowerCase().includes(draft.toLowerCase()))).slice(0, 12);

  async function save() {
    setSaving(true);
    try {
      await api("PUT", `/api/users/${userId}/skills`, { skills: draft.trim() ? [...value, draft.trim()] : value });
      toast.success(`Skills updated for ${name}`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setValue(skills); setDraft(""); } }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skills · {name}</DialogTitle>
          <DialogDescription>Type a skill and press Enter, or pick from skills already used in the team.</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-12 flex-wrap gap-1.5 rounded-[20px] bg-surface-muted p-2.5">
          {value.length === 0 && <span className="px-1.5 py-1 text-sm text-muted-foreground">No skills yet</span>}
          {value.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-ink py-1 pl-3 pr-1.5 text-xs font-medium text-white">
              {s}
              <button type="button" className="cursor-pointer rounded-full p-0.5 hover:bg-white/20" onClick={() => setValue((v) => v.filter((x) => x !== s))} aria-label={`Remove ${s}`}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add(draft);
              } else if (e.key === "Backspace" && !draft && value.length) {
                setValue((v) => v.slice(0, -1));
              }
            }}
            placeholder="e.g. Motion Design"
            maxLength={40}
            aria-label="New skill"
          />
          <Button type="button" variant="outline" size="icon" onClick={() => add(draft)} disabled={!draft.trim()} aria-label="Add skill">
            <Plus />
          </Button>
        </div>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => add(s)} className={cn("cursor-pointer rounded-full border border-black/[0.08] bg-white px-2.5 py-1 text-xs hover:bg-surface-muted")}>
                + {s}
              </button>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="animate-spin" />}Save skills</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
