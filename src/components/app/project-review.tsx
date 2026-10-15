"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/components/app/api-client";

/** Design Head: approve or decline a Design Manager's project request. */
export function ProjectReviewActions({ projectId, projectName, size = "default" }: { projectId: string; projectName: string; size?: "default" | "sm" }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"APPROVE" | "REJECT" | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function review(decision: "APPROVE" | "REJECT") {
    setBusy(decision);
    setError(null);
    try {
      await api("POST", `/api/projects/${projectId}/review`, { decision, note: note.trim() || undefined });
      toast.success(decision === "APPROVE" ? `“${projectName}” approved` : "Request declined — the manager has been told why");
      setOpen(false);
      router.refresh();
    } catch (err) {
      if (decision === "REJECT") setError((err as Error).message);
      else toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size={size} onClick={() => review("APPROVE")} disabled={!!busy}>
        {busy === "APPROVE" ? <Loader2 className="animate-spin" /> : <Check />}
        Approve
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setNote(""); setError(null); } }}>
        <DialogTrigger asChild>
          <Button size={size} variant="outline" disabled={!!busy}><X />Decline</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline “{projectName}”?</DialogTitle>
            <DialogDescription>The manager sees your reason and can edit the project and resubmit it.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="review-note">Reason</Label>
            <Textarea id="review-note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please confirm the client budget and push the ETA by two weeks." autoFocus />
          </div>
          {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => review("REJECT")} disabled={!!busy || !note.trim()}>
              {busy === "REJECT" && <Loader2 className="animate-spin" />}
              Decline request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
