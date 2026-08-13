import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAdminUserId } from "@/lib/adminAuth";
import { ChevronDown, ChevronUp, RotateCcw, Trash2 } from "lucide-react";

interface PageVideoEntry {
  page_key: string;
  video_url: string | null;
  label: string;
}

interface HistoryItem {
  id: string;
  video_url: string;
  replaced_at: string;
}

const PAGE_VIDEO_CONFIG: { page_key: string; label: string }[] = [
  { page_key: "dashboard_male", label: "Male / Normal User Dashboard" },
  { page_key: "dashboard_dimes", label: "Stripper / Exotic Dashboard" },
  { page_key: "tip_win_page", label: "Tip & Win Page" },
  { page_key: "rate_page", label: "Rate Girls Page" },
  { page_key: "rate_how_it_works", label: "Rate Girls — How It Works Video" },
  { page_key: "dimes_directory_page", label: "Dimes Directory Page" },
  { page_key: "events_male_page", label: "Events Page (Males)" },
  { page_key: "events_dimes_page", label: "Events Page (Dimes / Strippers)" },
  { page_key: "home_hero_desktop", label: "Home Hero Video (Desktop)" },
  { page_key: "home_hero_mobile", label: "Home Hero Video (Mobile)" },
  { page_key: "home_fullwidth_desktop", label: "Home Full-Width Video (Desktop)" },
  { page_key: "home_fullwidth_mobile", label: "Home Full-Width Video (Mobile)" },
  { page_key: "home_background", label: "Home Background Ladies Video" },
  { page_key: "register_male", label: "Registration – Male Explainer" },
  { page_key: "register_female_normal", label: "Registration – Female Normal Explainer" },
  { page_key: "register_female_exotic", label: "Registration – Female Exotic Explainer" },
  { page_key: "register_female_stripper", label: "Registration – Female Stripper Explainer" },
  { page_key: "register_business_owner", label: "Registration – Business Owner Explainer" },
  { page_key: "dashboard_business_owner", label: "Business Owner Home / Dashboard" },
  { page_key: "profile_business_owner_banner", label: "Business Owner Profile Top Banner" },
  { page_key: "email_performer_approved", label: "Email — Performer Approved Video" },
  { page_key: "email_performer_not_approved", label: "Email — Performer Not Approved Video" },
  { page_key: "rentals_page", label: "Rentals Page Header Video" },
  { page_key: "age_gate_explainer", label: "Home Age Gate — Explainer Video" },
  { page_key: "make_money_promo", label: "Make Money Tab — Promo Video" },

];

const VideoHoverPreview: React.FC<{ url: string; anchorRef: React.RefObject<HTMLElement | null> }> = ({ url }) => {
  return (
    <div className="absolute left-0 bottom-full mb-2 z-50 w-64 rounded-lg overflow-hidden shadow-xl border border-border/40 bg-black">
      <video
        className="w-full h-36 object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src={url} type="video/mp4" />
      </video>
    </div>
  );
};

const HistoryEntry: React.FC<{
  item: HistoryItem;
  onRevert: (url: string) => void;
  onDelete: (item: HistoryItem) => void;
  reverting: boolean;
  deleting?: boolean;
}> = ({ item, onRevert, onDelete, reverting, deleting }) => {
  const [hovering, setHovering] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="relative flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {hovering && <VideoHoverPreview url={item.video_url} anchorRef={ref} />}
      <span className="flex-1 text-sm text-muted-foreground truncate font-mono" title={item.video_url}>
        {item.video_url}
      </span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {new Date(item.replaced_at).toLocaleDateString()}
      </span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onRevert(item.video_url)}
        disabled={reverting}
        className="h-7 w-7 p-0"
        title="Revert to this video"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onDelete(item)}
        disabled={deleting}
        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
        title="Delete this video from history"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

const AdminBannerVideoTab: React.FC = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<PageVideoEntry[]>([]);
  const [editUrls, setEditUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Record<string, HistoryItem[]>>({});
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});
  const [reverting, setReverting] = useState<Record<string, boolean>>({});
  const [deletingHistory, setDeletingHistory] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchVideos();
    fetchHistory();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("page_videos")
        .select("page_key, video_url");

      if (error) throw error;

      const mapped = PAGE_VIDEO_CONFIG.map((cfg) => {
        const row = (data as any[])?.find((r: any) => r.page_key === cfg.page_key);
        return {
          page_key: cfg.page_key,
          video_url: row?.video_url ?? null,
          label: cfg.label,
        };
      });

      setEntries(mapped);
      const urls: Record<string, string> = {};
      mapped.forEach((e) => {
        urls[e.page_key] = e.video_url || "";
      });
      setEditUrls(urls);
    } catch (err) {
      console.error("Failed to fetch page videos:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("page_video_history")
        .select("id, page_key, video_url, replaced_at")
        .order("replaced_at", { ascending: false });

      if (error) throw error;

      const grouped: Record<string, HistoryItem[]> = {};
      (data as any[])?.forEach((row: any) => {
        if (!grouped[row.page_key]) grouped[row.page_key] = [];
        grouped[row.page_key].push({
          id: row.id,
          video_url: row.video_url,
          replaced_at: row.replaced_at,
        });
      });
      setHistory(grouped);
    } catch (err) {
      console.error("Failed to fetch video history:", err);
    }
  };

  const saveToHistory = async (pageKey: string, oldUrl: string) => {
    const adminUserId = getAdminUserId();
    if (!adminUserId) return;
    await supabase.functions.invoke("admin-data", {
      body: { action: "insertPageVideoHistory", adminUserId, pageKey, videoUrl: oldUrl },
    });
  };


  const handleSave = async (pageKey: string) => {
    const adminUserId = getAdminUserId();
    if (!adminUserId) {
      toast({ title: "Error", description: "Admin session not found", variant: "destructive" });
      return;
    }

    setSaving((s) => ({ ...s, [pageKey]: true }));

    try {
      // Save current URL to history before overwriting
      const currentEntry = entries.find((e) => e.page_key === pageKey);
      if (currentEntry?.video_url && currentEntry.video_url !== editUrls[pageKey]) {
        await saveToHistory(pageKey, currentEntry.video_url);
      }

      const { data: resp, error } = await supabase.functions.invoke("admin-data", {
        body: {
          action: "upsertPageVideo",
          adminUserId,
          pageKey,
          videoUrl: editUrls[pageKey] || null,
        },
      });

      if (error) throw error;
      if ((resp as any)?.error) throw new Error((resp as any).error);


      toast({ title: "Saved", description: `Video URL updated for ${PAGE_VIDEO_CONFIG.find((c) => c.page_key === pageKey)?.label}` });

      setEntries((prev) =>
        prev.map((e) => (e.page_key === pageKey ? { ...e, video_url: editUrls[pageKey] || null } : e))
      );

      // Refresh history
      await fetchHistory();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving((s) => ({ ...s, [pageKey]: false }));
    }
  };

  const handleDeleteHistory = async (pageKey: string, item: HistoryItem) => {
    const adminUserId = getAdminUserId();
    if (!adminUserId) {
      toast({ title: "Error", description: "Admin session not found", variant: "destructive" });
      return;
    }
    if (!window.confirm("Delete this video from the previous videos list?")) return;

    setDeletingHistory((s) => ({ ...s, [item.id]: true }));
    try {
      const { data: resp, error } = await supabase.functions.invoke("admin-data", {
        body: {
          action: "deletePageVideoHistory",
          adminUserId,
          pageKey,
          videoUrl: item.video_url,
          historyId: item.id,
        },
      });
      if (error) throw error;
      if ((resp as any)?.error) throw new Error((resp as any).error);

      setHistory((prev) => ({
        ...prev,
        [pageKey]: (prev[pageKey] || []).filter((h) => h.id !== item.id),
      }));
      toast({ title: "Deleted", description: "Video removed from previous videos." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete", variant: "destructive" });
    } finally {
      setDeletingHistory((s) => ({ ...s, [item.id]: false }));
    }
  };

  const handleRevert = async (pageKey: string, revertUrl: string) => {
    const adminUserId = getAdminUserId();
    if (!adminUserId) {
      toast({ title: "Error", description: "Admin session not found", variant: "destructive" });
      return;
    }

    setReverting((s) => ({ ...s, [pageKey]: true }));

    try {
      // Save current URL to history before reverting
      const currentEntry = entries.find((e) => e.page_key === pageKey);
      if (currentEntry?.video_url && currentEntry.video_url !== revertUrl) {
        await saveToHistory(pageKey, currentEntry.video_url);
      }

      // Remove the reverted URL from history (it's becoming current)
      await supabase.functions.invoke("admin-data", {
        body: {
          action: "deletePageVideoHistory",
          adminUserId,
          pageKey,
          videoUrl: revertUrl,
        },
      });

      // Set as current
      const { data: resp, error } = await supabase.functions.invoke("admin-data", {
        body: {
          action: "upsertPageVideo",
          adminUserId,
          pageKey,
          videoUrl: revertUrl,
        },
      });

      if (error) throw error;
      if ((resp as any)?.error) throw new Error((resp as any).error);


      toast({ title: "Reverted", description: `Video reverted for ${PAGE_VIDEO_CONFIG.find((c) => c.page_key === pageKey)?.label}` });

      setEntries((prev) =>
        prev.map((e) => (e.page_key === pageKey ? { ...e, video_url: revertUrl } : e))
      );
      setEditUrls((prev) => ({ ...prev, [pageKey]: revertUrl }));

      await fetchHistory();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to revert", variant: "destructive" });
    } finally {
      setReverting((s) => ({ ...s, [pageKey]: false }));
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading video settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Banner Video Management</h2>
        <p className="text-muted-foreground mt-1">Manage video banners displayed on each page. Paste a direct video URL (MP4/WebM).</p>
      </div>

      {entries.map((entry) => {
        const pageHistory = history[entry.page_key] || [];
        const isHistoryOpen = openHistory[entry.page_key] || false;

        return (
          <Card key={entry.page_key}>
            <CardHeader>
              <CardTitle className="text-lg">{entry.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {entry.video_url && (
                <div className="w-full max-w-lg">
                  <video
                    className="w-full rounded-lg border"
                    controls
                    preload="metadata"
                    key={entry.video_url}
                  >
                    <source src={entry.video_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium text-foreground mb-1 block">Video URL</label>
                  <Input
                    placeholder="Paste Banner video link here"
                    value={editUrls[entry.page_key] || ""}
                    onChange={(e) =>
                      setEditUrls((prev) => ({ ...prev, [entry.page_key]: e.target.value }))
                    }
                  />
                </div>
                <Button
                  onClick={() => handleSave(entry.page_key)}
                  disabled={saving[entry.page_key]}
                  className="w-full sm:w-auto"
                >
                  {saving[entry.page_key] ? "Saving..." : "Save"}
                </Button>
              </div>

              {/* History Section */}
              {pageHistory.length > 0 && (
                <div>
                  <button
                    onClick={() =>
                      setOpenHistory((prev) => ({ ...prev, [entry.page_key]: !isHistoryOpen }))
                    }
                    className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isHistoryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Previous Videos ({pageHistory.length})
                  </button>

                  {isHistoryOpen && (
                    <div className="mt-2 space-y-1.5">
                      {pageHistory.map((item) => (
                        <HistoryEntry
                          key={item.id}
                          item={item}
                          onRevert={(url) => handleRevert(entry.page_key, url)}
                          reverting={reverting[entry.page_key] || false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminBannerVideoTab;
