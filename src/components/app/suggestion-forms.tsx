"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { EyeOff, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/components/app/api-client";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_CATEGORY_LABEL,
  SUGGESTION_STATUS,
  SUGGESTION_STATUSES,
  type SuggestionCategory,
  type SuggestionStatus,
} from "@/lib/constants";

export function NewSuggestionDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [v, setV] = useState({ title: "", category: "PROCESS" as SuggestionCategory, message: "", anonymous: false });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api<{ id: string }>("POST", "/api/suggestions", v);
      toast.success("Suggestion sent to the Design Head");
      setOpen(false);
      router.push(`/suggestions/${res.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setV({ title: "", category: "PROCESS", message: "", anonymous: false }); setError(null); } }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New suggestion</DialogTitle>
          <DialogDescription>Share an idea or feedback with the Design Head.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="s-title">Title</Label>
            <Input id="s-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} required maxLength={140} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-cat">Category</Label>
            <NativeSelect id="s-cat" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value as SuggestionCategory })}>
              {SUGGESTION_CATEGORIES.map((c) => <option key={c} value={c}>{SUGGESTION_CATEGORY_LABEL[c]}</option>)}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-msg">Message</Label>
            <Textarea id="s-msg" value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} rows={5} required />
          </div>
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted px-4 py-3">
            <span className="flex items-start gap-2">
              <EyeOff className="mt-0.5 size-4 text-muted-foreground" />
              <span>
                <span className="block text-sm font-medium">Submit anonymously</span>
                <span className="block text-xs text-muted-foreground">The Design Head sees “Anonymous”. You can still follow replies here.</span>
              </span>
            </span>
            <Switch checked={v.anonymous} onCheckedChange={(c) => setV({ ...v, anonymous: c })} />
          </label>
          {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Submit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReplyForm({ suggestionId }: { suggestionId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        setSaving(true);
        try {
          await api("POST", `/api/suggestions/${suggestionId}/replies`, { message });
          setMessage("");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setSaving(false);
        }
      }}
    >
      <Label htmlFor="reply" className="sr-only">Reply</Label>
      <Textarea id="reply" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a reply…" rows={3} />
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || !message.trim()}>
          {saving ? <Loader2 className="animate-spin" /> : <Send />}
          Reply
        </Button>
      </div>
    </form>
  );
}

export function SuggestionStatusSelect({ suggestionId, status }: { suggestionId: string; status: SuggestionStatus }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  return (
    <NativeSelect
      aria-label="Suggestion status"
      className="w-52"
      value={status}
      disabled={saving}
      onChange={async (e) => {
        setSaving(true);
        try {
          await api("PATCH", `/api/suggestions/${suggestionId}`, { status: e.target.value });
          toast.success("Status updated");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setSaving(false);
        }
      }}
    >
      {SUGGESTION_STATUSES.map((s) => <option key={s} value={s}>{SUGGESTION_STATUS[s].label}</option>)}
    </NativeSelect>
  );
}
