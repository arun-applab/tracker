import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, EyeOff } from "lucide-react";
import { SuggestionStatusBadge } from "@/components/app/badges";
import { ReplyForm, SuggestionStatusSelect } from "@/components/app/suggestion-forms";
import { RefreshOnMount } from "@/components/app/refresh-on-mount";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SUGGESTION_CATEGORY_LABEL } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { formatDateTime } from "@/lib/server-time";
import { cn } from "@/lib/utils";
import { requireActor } from "@/server/actor";
import { getSuggestion } from "@/server/services/suggestions";

export default async function SuggestionPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor(["HEAD", "MANAGER"]);
  const { id } = await params;
  let s;
  try {
    s = await getSuggestion(actor, id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }

  return (
    <div className="mx-auto max-w-3xl">
      {s.wasUnread && <RefreshOnMount />}
      <Link href="/suggestions" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Suggestions
      </Link>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <SuggestionStatusBadge status={s.status} />
            <Badge variant="outline">{SUGGESTION_CATEGORY_LABEL[s.category]}</Badge>
            {s.anonymous && <Badge variant="secondary"><EyeOff />Anonymous</Badge>}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        </div>
        {s.canSetStatus && <SuggestionStatusSelect suggestionId={s.id} status={s.status} />}
      </div>

      <Card className="mb-4">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2.5">
            {s.anonymous && s.authorLabel === "Anonymous" ? (
              <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground"><EyeOff className="size-4" /></span>
            ) : (
              <Avatar name={s.author.name} />
            )}
            <div>
              <p className="text-sm font-medium">{s.authorLabel}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(s.createdAt)}</p>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{s.message}</p>
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{s.replies.length ? `${s.replies.length} ${s.replies.length === 1 ? "reply" : "replies"}` : "No replies yet"}</h2>
      <ol className="mb-6 space-y-3">
        {s.replies.map((r) => (
          <li key={r.id} className={cn("flex", r.mine ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-[20px] px-4 py-3", r.mine ? "rounded-br-md bg-ink text-white [&_p:first-child]:text-white/60" : "rounded-bl-md bg-white/90")}>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {r.authorLabel} · {formatDateTime(r.createdAt)}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.message}</p>
            </div>
          </li>
        ))}
      </ol>

      {s.canReply && (
        <Card>
          <CardContent>
            <ReplyForm suggestionId={s.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
