import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_CATEGORIES,
  NotificationCategory,
  categorizeNotification,
} from "@/lib/notificationCategories";

interface Row {
  id: string;
  title: string;
  message: string;
  type: string | null;
  link: string | null;
  data: Record<string, unknown> | null;
  media_url: string | null;
  media_type: string | null;
  is_read: boolean | null;
  created_at: string | null;
}

type Filter = "all" | NotificationCategory;

const UserNotificationsTab: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { toast } = useToast();
  const { user } = useAppContext();
  const navigate = useNavigate();

  const load = async () => {
    if (!user?.id) return setLoading(false);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, type, link, data, media_url, media_type, is_read, created_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast({ title: "Error", description: "Failed to load notifications", variant: "destructive" });
    else setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!user?.id) return;
    void load();
    const channel = supabase
      .channel(`notification-center-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` }, () => void load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const withCat = useMemo(
    () => rows.map((r) => ({ ...r, category: categorizeNotification(r.type, r.link, r.data) })),
    [rows],
  );
  const unreadCount = (k: Filter) =>
    withCat.filter((r) => !r.is_read && (k === "all" || r.category === k)).length;
  const visible = withCat.filter(
    (r) => (filter === "all" || r.category === filter) && (!unreadOnly || !r.is_read),
  );

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    if (!error) setRows((p) => p.map((r) => (ids.includes(r.id) ? { ...r, is_read: true } : r)));
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (!error) setRows((p) => p.filter((r) => r.id !== id));
  };

  if (!user) return <p className="py-8 text-center text-muted-foreground">Please log in to view notifications</p>;

  const tabs: { key: Filter; label: string }[] = [{ key: "all", label: "All" }, ...NOTIFICATION_CATEGORIES];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Bell className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Notification Center</h2>
        <Badge variant="secondary">{unreadCount("all")} unread</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={unreadOnly ? "default" : "outline"} onClick={() => setUnreadOnly((v) => !v)}>
            Unread only
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => markRead(visible.filter((r) => !r.is_read).map((r) => r.id))}
          >
            <CheckCheck className="mr-1 h-4 w-4" /> Mark all read
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const n = unreadCount(t.key);
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold touch-manipulation",
                filter === t.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
              )}
            >
              {t.label}
              {n > 0 && <span className="rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">{n}</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No notifications here yet</CardContent>
        </Card>
      ) : (
        visible.map((n) => {
          const cat = NOTIFICATION_CATEGORIES.find((c) => c.key === n.category)!;
          const target = n.link && n.link.startsWith("/") ? n.link : cat.link;
          return (
            <Card key={n.id} className={cn(!n.is_read && "border-primary/60")}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-start gap-2">
                  <Badge variant="outline">{cat.label}</Badge>
                  {!n.is_read && <Badge>New</Badge>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                  </span>
                </div>
                <p className="font-semibold">{n.title}</p>
                <p className="whitespace-pre-wrap break-words text-muted-foreground">{n.message}</p>
                {n.media_url && n.media_type === "photo" && (
                  <img src={n.media_url} alt="" className="max-h-72 rounded-lg" />
                )}
                {n.media_url && n.media_type === "video" && (
                  <video src={n.media_url} controls className="max-h-72 w-full rounded-lg" />
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      void markRead([n.id]);
                      navigate(target);
                    }}
                  >
                    Open {cat.label}
                  </Button>
                  {!n.is_read && (
                    <Button type="button" size="sm" variant="outline" onClick={() => markRead([n.id])}>
                      Mark read
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={() => remove(n.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default UserNotificationsTab;
