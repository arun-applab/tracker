"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, BellRing, CheckCheck, Loader2, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/components/app/api-client";
import { ThreadDialog } from "@/components/app/thread-dialog";
import { formatHours, formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type OpenThread = { id: string; date: string; hours: number; user: { id: string; name: string }; project: { id: string; name: string }; lastMessage: string; lastAuthor: string; lastAt: string };
type Item = { id: string; type: string; title: string; body: string; link: string | null; read: boolean; createdAt: string; actorName: string | null };
type Feed = { unread: number; items: Item[]; threads: OpenThread[] };

const POLL_MS = 20_000;

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return formatShortDate(iso.slice(0, 10));
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const threadIdOf = (link: string | null) => (link?.startsWith("/?thread=") ? link.slice("/?thread=".length) : null);

type PushState = "unsupported" | "off" | "on" | "denied" | "busy";

/** Browser push on/off for this device (service worker + VAPID). */
function usePush(publicKey: string | null) {
  const [state, setState] = useState<PushState>("unsupported");

  useEffect(() => {
    if (!publicKey || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("unsupported"));
  }, [publicKey]);

  async function enable() {
    if (!publicKey) return;
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      await api("POST", "/api/push", sub.toJSON());
      setState("on");
      toast.success("Desktop notifications are on for this browser");
    } catch (err) {
      setState("off");
      toast.error(`Couldn't turn on notifications: ${(err as Error).message}`);
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api("DELETE", "/api/push", { endpoint: sub.endpoint }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Desktop notifications are off for this browser");
    } catch {
      setState("on");
    }
  }

  return { state, enable, disable };
}

/**
 * Bell in the top bar: live notifications (polled every 20s and when the tab regains focus,
 * with a toast for anything new) plus time-entry threads waiting for your reply.
 */
export function NotificationBell({ initial, vapidPublicKey }: { initial: Feed; vapidPublicKey: string | null }) {
  const router = useRouter();
  const [feed, setFeed] = useState<Feed>(initial);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "replies">("all");
  const [thread, setThread] = useState<string | null>(null);
  const seen = useRef(new Set(initial.items.map((i) => i.id)));
  const push = usePush(vapidPublicKey);

  const openItem = useCallback(
    (item: Pick<Item, "id" | "link" | "read">) => {
      if (!item.read) {
        setFeed((f) => ({ ...f, unread: Math.max(0, f.unread - 1), items: f.items.map((i) => (i.id === item.id ? { ...i, read: true } : i)) }));
        void api("POST", "/api/notifications/read", { ids: [item.id] }).catch(() => {});
      }
      setOpen(false);
      const t = threadIdOf(item.link);
      if (t) setThread(t);
      else if (item.link) router.push(item.link);
    },
    [router],
  );

  const refresh = useCallback(async () => {
    try {
      const next = await api<Feed>("GET", "/api/notifications");
      const fresh = next.items.filter((i) => !i.read && !seen.current.has(i.id));
      for (const i of next.items) seen.current.add(i.id);
      setFeed(next);
      if (fresh.length) {
        // Server data behind the current page may have changed too.
        router.refresh();
        for (const i of fresh.slice(0, 3).reverse()) {
          toast(i.title, { description: i.body, duration: 8000, action: i.link ? { label: "Open", onClick: () => openItem(i) } : undefined });
        }
        if (fresh.length > 3) toast(`${fresh.length - 3} more notifications`, { action: { label: "View", onClick: () => setOpen(true) } });
      }
    } catch {
      /* offline or signed out — try again next tick */
    }
  }, [router, openItem]);

  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    // A click on a push notification while the app is open posts a message from the service worker.
    const onMessage = (e: MessageEvent) => e.data?.type === "notification-click" && refresh();
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [refresh]);

  // Links like /?thread=<id> (from a push notification) open the discussion directly.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("thread");
    if (id) {
      setThread(id);
      const url = new URL(window.location.href);
      url.searchParams.delete("thread");
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  async function markAll() {
    setFeed((f) => ({ ...f, unread: 0, items: f.items.map((i) => ({ ...i, read: true })) }));
    await api("POST", "/api/notifications/read", { all: true }).catch(() => {});
  }

  const badge = feed.unread + feed.threads.length;

  return (
    <>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) void refresh(); }}>
        <PopoverTrigger className="icon-btn relative size-11" aria-label={`Notifications: ${feed.unread} unread, ${feed.threads.length} waiting for reply`}>
          {feed.unread ? <BellRing /> : <Bell />}
          {badge > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e26d6d] px-1 text-[10px] font-semibold text-white ring-2 ring-white tabular">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(380px,calc(100vw-24px))] p-0">
          <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] px-4 py-3">
            <div className="flex gap-1 rounded-full bg-surface-muted p-1 text-xs">
              <button type="button" onClick={() => setTab("all")} className={cn("cursor-pointer rounded-full px-3 py-1 font-medium transition", tab === "all" ? "bg-ink text-white" : "text-muted-foreground hover:text-foreground")}>
                Notifications{feed.unread ? ` · ${feed.unread}` : ""}
              </button>
              <button type="button" onClick={() => setTab("replies")} className={cn("cursor-pointer rounded-full px-3 py-1 font-medium transition", tab === "replies" ? "bg-ink text-white" : "text-muted-foreground hover:text-foreground")}>
                Replies{feed.threads.length ? ` · ${feed.threads.length}` : ""}
              </button>
            </div>
            {tab === "all" && feed.unread > 0 && (
              <button type="button" onClick={markAll} className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <CheckCheck className="size-3.5" />Mark all read
              </button>
            )}
          </div>

          {tab === "all" ? (
            feed.items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              <ul className="max-h-[420px] overflow-y-auto p-1.5">
                {feed.items.map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => openItem(n)} className={cn("flex w-full cursor-pointer items-start gap-3 rounded-2xl px-2.5 py-2.5 text-left transition hover:bg-surface-muted", !n.read && "bg-brand-soft/60")}>
                      {n.actorName ? <Avatar name={n.actorName} className="size-8 text-[10px]" /> : <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted"><Bell className="size-4 text-muted-foreground" /></span>}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className={cn("truncate text-sm", n.read ? "font-medium" : "font-semibold")}>{n.title}</span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[13px] text-foreground/75">{n.body}</span>
                      </span>
                      {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#1154ed]" aria-label="Unread" />}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : feed.threads.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto p-1.5">
              {feed.threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-start gap-3 rounded-2xl px-2.5 py-2.5 text-left hover:bg-surface-muted"
                    onClick={() => {
                      setThread(t.id);
                      setOpen(false);
                    }}
                  >
                    <Avatar name={t.lastAuthor} className="size-8 text-[10px]" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 truncate text-sm font-medium"><MessageCircle className="size-3.5 text-[#b23b3b]" />{t.lastAuthor}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.project.name} · {t.user.name} · {formatShortDate(t.date)} · {formatHours(t.hours)}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[13px]">{t.lastMessage}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {push.state !== "unsupported" && (
            <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] px-4 py-3 text-xs">
              <span className="text-muted-foreground">
                {push.state === "on" ? "Desktop notifications are on for this browser." : push.state === "denied" ? "Notifications are blocked in your browser settings." : "Get a pop-up even when this tab is closed."}
              </span>
              {push.state === "on" ? (
                <button type="button" onClick={push.disable} className="inline-flex shrink-0 cursor-pointer items-center gap-1 font-medium text-muted-foreground hover:text-foreground"><BellOff className="size-3.5" />Turn off</button>
              ) : push.state === "denied" ? null : (
                <button type="button" onClick={push.enable} disabled={push.state === "busy"} className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-ink px-3 py-1.5 font-medium text-white">
                  {push.state === "busy" ? <Loader2 className="size-3.5 animate-spin" /> : <BellRing className="size-3.5" />}
                  Turn on
                </button>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
      <ThreadDialog logId={thread} open={!!thread} onOpenChange={(o) => !o && setThread(null)} />
    </>
  );
}
