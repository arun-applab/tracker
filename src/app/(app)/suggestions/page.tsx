import Link from "next/link";
import { MessageSquare, MessageSquareText, Plus } from "lucide-react";
import { AutoSubmitForm } from "@/components/app/auto-submit-form";
import { SuggestionStatusBadge } from "@/components/app/badges";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { NewSuggestionDialog } from "@/components/app/suggestion-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_CATEGORY_LABEL,
  SUGGESTION_STATUS,
  SUGGESTION_STATUSES,
  type SuggestionCategory,
  type SuggestionStatus,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/server-time";
import { cn } from "@/lib/utils";
import { requireActor } from "@/server/actor";
import { isHead } from "@/server/permissions";
import { listSuggestions } from "@/server/services/suggestions";

export const metadata = { title: "Suggestions" };

export default async function SuggestionsPage({ searchParams }: { searchParams: Promise<{ status?: string; category?: string }> }) {
  const actor = await requireActor(["HEAD", "MANAGER"]);
  const sp = await searchParams;
  const status = SUGGESTION_STATUSES.includes(sp.status as SuggestionStatus) ? (sp.status as SuggestionStatus) : undefined;
  const category = SUGGESTION_CATEGORIES.includes(sp.category as SuggestionCategory) ? (sp.category as SuggestionCategory) : undefined;
  const items = await listSuggestions(actor, { status, category });
  const head = isHead(actor);
  const unread = items.filter((i) => i.unread).length;

  return (
    <>
      <PageHeader
        title={head ? "Suggestions inbox" : "Suggestions corner"}
        description={head ? `Feedback from Design Managers.${unread ? ` ${unread} unread.` : ""}` : `Your suggestions to the Design Head, with replies.${unread ? ` ${unread} with new replies.` : ""}`}
        actions={
          !head && (
            <NewSuggestionDialog>
              <Button><Plus />New suggestion</Button>
            </NewSuggestionDialog>
          )
        }
      />
      <AutoSubmitForm className="mb-4 flex flex-wrap items-center gap-2">
        <NativeSelect name="status" defaultValue={status ?? ""} className="w-52" aria-label="Status">
          <option value="">All statuses</option>
          {SUGGESTION_STATUSES.map((s) => <option key={s} value={s}>{SUGGESTION_STATUS[s].label}</option>)}
        </NativeSelect>
        <NativeSelect name="category" defaultValue={category ?? ""} className="w-44" aria-label="Category">
          <option value="">All categories</option>
          {SUGGESTION_CATEGORIES.map((c) => <option key={c} value={c}>{SUGGESTION_CATEGORY_LABEL[c]}</option>)}
        </NativeSelect>
        {(status || category) && <Button variant="ghost" size="sm" asChild><Link href="/suggestions">Clear</Link></Button>}
      </AutoSubmitForm>

      {items.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title={status || category ? "Nothing matches these filters" : head ? "No suggestions yet" : "You haven't submitted any suggestions"}
          description={head ? "When Design Managers share feedback, it lands here." : "Ideas about process, tools or workload are welcome."}
          action={!head && !status && !category ? <NewSuggestionDialog><Button><Plus />New suggestion</Button></NewSuggestionDialog> : undefined}
        />
      ) : (
        <ul className="panel divide-y divide-black/[0.06] overflow-hidden">
          {items.map((s) => (
            <li key={s.id} className={cn("relative px-4 py-3.5 transition-colors hover:bg-muted/40", s.unread && "bg-primary/[0.03]")}>
              <div className="flex items-start gap-3">
                <span className={cn("mt-2 size-2 shrink-0 rounded-full", s.unread ? "bg-primary" : "bg-transparent")} aria-label={s.unread ? "Unread" : undefined} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/suggestions/${s.id}`} className={cn("after:absolute after:inset-0 hover:underline", s.unread ? "font-semibold" : "font-medium")}>
                      {s.title}
                    </Link>
                    <SuggestionStatusBadge status={s.status} />
                    <Badge variant="outline">{SUGGESTION_CATEGORY_LABEL[s.category]}</Badge>
                    {s.unread && <Badge>{head && s.replyCount === 0 ? "New" : "New reply"}</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{s.preview}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.author} · {formatDateTime(s.createdAt)}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="size-3.5" /> {s.replyCount}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
