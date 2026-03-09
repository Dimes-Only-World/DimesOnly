import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAdminUserId } from "@/lib/adminAuth";

interface PageVideoEntry {
  page_key: string;
  video_url: string | null;
  label: string;
}

const PAGE_VIDEO_CONFIG: { page_key: string; label: string }[] = [
  { page_key: "dashboard_male", label: "Male / Normal User Dashboard" },
  { page_key: "dashboard_dimes", label: "Stripper / Exotic Dashboard" },
  { page_key: "tip_win_page", label: "Tip & Win Page" },
  { page_key: "rate_page", label: "Rate Girls Page" },
  { page_key: "dimes_directory_page", label: "Dimes Directory Page" },
  { page_key: "events_male_page", label: "Events Page (Males)" },
  { page_key: "events_dimes_page", label: "Events Page (Dimes / Strippers)" },
];

const AdminBannerVideoTab: React.FC = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<PageVideoEntry[]>([]);
  const [editUrls, setEditUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
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

  const handleSave = async (pageKey: string) => {
    const adminUserId = getAdminUserId();
    if (!adminUserId) {
      toast({ title: "Error", description: "Admin session not found", variant: "destructive" });
      return;
    }

    setSaving((s) => ({ ...s, [pageKey]: true }));

    try {
      const { error } = await supabase
        .from("page_videos")
        .upsert(
          {
            page_key: pageKey,
            video_url: editUrls[pageKey] || null,
            updated_at: new Date().toISOString(),
            updated_by: adminUserId,
          },
          { onConflict: "page_key" }
        );

      if (error) throw error;

      toast({ title: "Saved", description: `Video URL updated for ${PAGE_VIDEO_CONFIG.find((c) => c.page_key === pageKey)?.label}` });
      
      setEntries((prev) =>
        prev.map((e) => (e.page_key === pageKey ? { ...e, video_url: editUrls[pageKey] || null } : e))
      );
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving((s) => ({ ...s, [pageKey]: false }));
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading video settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Banner Video Management</h2>
        <p className="text-gray-600 mt-1">Manage video banners displayed on each page. Paste a direct video URL (MP4/WebM).</p>
      </div>

      {entries.map((entry) => (
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
                <label className="text-sm font-medium text-gray-700 mb-1 block">Video URL</label>
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminBannerVideoTab;
