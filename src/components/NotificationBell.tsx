import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, Check, Loader2, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { useOneSignal } from "@/hooks/useOneSignal";
import { cn } from "@/lib/utils";

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string | null;
  link: string | null;
  is_read: boolean | null;
  created_at: string | null;
}

const timeAgo = (iso: string | null) => {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const secs = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const TYPE_ACCENT: Record<string, string> = {
  referral: "bg-emerald-400",
  payout: "bg-amber-400",
  tip: "bg-pink-400",
  jackpot: "bg-yellow-300",
  membership: "bg-sky-400",
  admin: "bg-fuchsia-400",
  system: "bg-slate-400",
};

const resolveUserId = (contextId?: string): string | null => {
  if (contextId) return contextId;
  try {
    for (const key of ["userData", "currentUser"]) {
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.id) return String(parsed.id);
    }
  } catch {
    /* ignore */
  }
  return null;
};

const NotificationBell: React.FC<{ className?: string }> = ({ className }) => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [userId, setUserId] = useState<string | null>(() => resolveUserId(user?.id));
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const { pushState, enablePush, pushBusy, pushError } = useOneSignal(userId);

  // Resolve identity (context, storage, or an active Supabase session).
  useEffect(() => {
    let cancelled = false;
    const fromContext = resolveUserId(user?.id);
    if (fromContext) {
      setUserId(fromContext);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session?.user?.id) setUserId(data.session.user.id);
    });
    const onReady = () => {
      const id = resolveUserId(undefined);
      if (id) setUserId(id);
    };
    window.addEventListener("dimes-auth-session-ready", onReady);
    return () => {
      cancelled = true;
      window.removeEventListener("dimes-auth-session-ready", onReady);
    };
  }, [user?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, type, link, is_read, created_at")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setItems((data || []) as NotificationRow[]);
    } catch (e) {
      console.warn("Could not load notifications", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void fetchNotifications();

    const channel = supabase
      .channel(`notif-bell-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        () => {
          void fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  const unread = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    if (!userId || unread === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", userId)
      .eq("is_read", false);
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  const openItem = async (n: NotificationRow) => {
    if (!n.is_read) await markRead(n.id);
    if (n.link) {
      setOpen(false);
      if (/^https?:\/\//i.test(n.link)) window.location.href = n.link;
      else navigate(n.link);
    }
  };

  if (!userId) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/40 bg-slate-900/90 text-amber-300 shadow-lg shadow-black/40 backdrop-blur transition-colors hover:border-amber-300 hover:text-amber-200 active:scale-95"
      >
        {unread > 0 ? <BellRing className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-slate-900">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/60 sm:bg-transparent"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className={cn(
              "z-[80] overflow-hidden rounded-2xl border border-amber-400/30 bg-slate-950 shadow-2xl shadow-black/60",
              "fixed inset-x-2 top-16 max-h-[75vh]",
              "sm:absolute sm:inset-auto sm:right-0 sm:top-14 sm:w-[380px]",
            )}
          >
            <div className="flex items-center justify-between border-b border-amber-400/20 px-4 py-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-amber-300">Notifications</h3>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-300/90 hover:bg-amber-400/10"
                  >
                    <Check className="h-3.5 w-3.5" /> Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {(pushState === "default" || pushState === "denied" || pushError) && (
              <div className="border-b border-amber-400/10 bg-amber-400/5 px-4 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs leading-snug text-slate-300">
                    {pushState === "denied"
                      ? "Push is blocked in your browser settings."
                      : "Get alerts on your phone's lock screen."}
                  </p>
                  {pushState === "default" && (
                    <button
                      type="button"
                      onClick={enablePush}
                      disabled={pushBusy}
                      className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pushBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {pushBusy ? "Enabling…" : "Enable"}
                    </button>
                  )}
                </div>
                {pushError && <p className="mt-1.5 text-[11px] text-red-400">{pushError}</p>}
              </div>
            )}

            {pushState === "granted" && (
              <div className="flex items-center gap-2 border-b border-amber-400/10 bg-emerald-400/5 px-4 py-2 text-[11px] text-emerald-300">
                <Check className="h-3.5 w-3.5" /> Lock-screen alerts are on for this device.
              </div>
            )}


            <div className="max-h-[55vh] overflow-y-auto sm:max-h-[420px]">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                  <p className="text-sm text-slate-400">You're all caught up.</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {items.map((n) => (
                    <li key={n.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => openItem(n)}
                        onKeyDown={(e) => e.key === "Enter" && openItem(n)}
                        className={cn(
                          "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5",
                          !n.is_read && "bg-amber-400/[0.06]",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            TYPE_ACCENT[String(n.type || "system")] || TYPE_ACCENT.system,
                            n.is_read && "opacity-30",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm text-white", !n.is_read && "font-semibold")}>
                            {n.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{n.message}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{timeAgo(n.created_at)}</p>
                        </div>
                        <button
                          type="button"
                          aria-label="Delete notification"
                          onClick={(e) => {
                            e.stopPropagation();
                            void remove(n.id);
                          }}
                          className="shrink-0 self-start rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
