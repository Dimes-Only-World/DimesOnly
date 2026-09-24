import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowDown, ArrowUp, Eraser, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClickRow {
  id: string;
  ad_id: string;
  user_id: string | null;
  username: string | null;
  link_url: string | null;
  clicked_at: string;
}

interface AdRow {
  id: string;
  slot_number: number;
  position: number;
  title: string | null;
  media_url: string | null;
  media_type: "image" | "gif" | "video";
  link_url: string | null;
  is_active: boolean;
}

const getAdminUserId = (): string | null => {
  try {
    const raw = sessionStorage.getItem("adminUser");
    return raw ? JSON.parse(raw)?.id || null : null;
  } catch {
    return null;
  }
};

const AdminAdvertisementTab: React.FC = () => {
  const { toast } = useToast();
  const [ads, setAds] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [onlyFilled, setOnlyFilled] = useState(false);

  const call = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      const adminUserId = getAdminUserId();
      if (!adminUserId) throw new Error("Admin session not found");
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action, adminUserId, ...extra },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as any)?.data;
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await call("listDashboardAds");
      setAds((rows || []) as AdRow[]);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to load ads", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [call, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (id: string, changes: Partial<AdRow>) =>
    setAds((prev) => prev.map((a) => (a.id === id ? { ...a, ...changes } : a)));

  const save = async (ad: AdRow) => {
    setSavingId(ad.id);
    try {
      await call("saveDashboardAd", {
        adId: ad.id,
        title: ad.title,
        mediaUrl: ad.media_url,
        mediaType: ad.media_type,
        linkUrl: ad.link_url,
        isActive: ad.is_active,
      });
      toast({ title: "Saved", description: `Spot ${ad.slot_number} updated` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Save failed", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const clear = async (ad: AdRow) => {
    if (!window.confirm(`Clear advertisement spot ${ad.slot_number}?`)) return;
    try {
      await call("clearDashboardAd", { adId: ad.id });
      patch(ad.id, { title: null, media_url: null, link_url: null, is_active: false });
      toast({ title: "Cleared", description: `Spot ${ad.slot_number} is empty` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed", variant: "destructive" });
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= ads.length) return;
    const next = [...ads];
    [next[index], next[target]] = [next[target], next[index]];
    setAds(next.map((a, i) => ({ ...a, position: i + 1 })));
    try {
      await call("reorderDashboardAds", { order: next.map((a) => a.id) });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Reorder failed", variant: "destructive" });
      load();
    }
  };

  const visible = onlyFilled ? ads.filter((a) => a.media_url) : ads;

  /* ------------------------------------------------ click report */
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reportAdId, setReportAdId] = useState("");
  const [clicks, setClicks] = useState<ClickRow[] | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const runReport = async () => {
    if (!fromDate || !toDate) {
      toast({ title: "Pick dates", description: "Choose a From and To date first.", variant: "destructive" });
      return;
    }
    setReportLoading(true);
    try {
      const rows = await call("listDashboardAdClicks", {
        adId: reportAdId || undefined,
        fromDate,
        toDate,
      });
      setClicks((rows || []) as ClickRow[]);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Report failed", variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  };

  const slotFor = (adId: string) => ads.find((a) => a.id === adId)?.slot_number ?? "";

  const downloadCsv = () => {
    if (!clicks?.length) return;
    const header = ["Date", "Time", "Username", "Spot", "Link"];
    const lines = clicks.map((c) => {
      const d = new Date(c.clicked_at);
      return [
        d.toLocaleDateString("en-US"),
        d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        c.username ? `@${c.username}` : "guest",
        `Spot ${slotFor(c.ad_id)}`,
        c.link_url || "",
      ]
        .map((v) => { const t = String(v); const safe = /^[=+\-@\t\r]/.test(t) ? `'${t}` : t; return `"${safe.replace(/"/g, '""')}"`; })
        .join(",");
    });
    const csv = [
      `"Report date","From ${fromDate}","To ${toDate}"`,
      `"Number of clicks","${clicks.length}"`,
      "",
      header.map((h) => `"${h}"`).join(","),
      ...lines,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ad-clicks_${fromDate}_to_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteOne = async (id: string) => {
    try {
      await call("deleteDashboardAdClicks", { clickIds: [id] });
      setClicks((prev) => (prev || []).filter((c) => c.id !== id));
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Delete failed", variant: "destructive" });
    }
  };

  const deleteRange = async () => {
    if (!window.confirm(`Delete all click records from ${fromDate} to ${toDate}?`)) return;
    try {
      await call("deleteDashboardAdClicks", { adId: reportAdId || undefined, fromDate, toDate });
      setClicks([]);
      toast({ title: "Deleted", description: "Click records removed" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Delete failed", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>Advertisements — 100 Spots</CardTitle>
        <div className="flex items-center gap-2">
          <Label htmlFor="only-filled" className="text-sm">
            Show only filled spots
          </Label>
          <Switch id="only-filled" checked={onlyFilled} onCheckedChange={setOnlyFilled} />
          <Button variant="outline" onClick={load}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Paste a video or GIF/image link into a spot, switch it on, and save. Ads appear in the member
          dashboard feed after every 3 rows, in the order shown below. Use the arrows to move a spot up
          or down.
        </p>

        {/* Click report for advertisers */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <h3 className="mb-3 text-base font-bold">Click Report</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Report date — From</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Advertisement</Label>
              <select
                value={reportAdId}
                onChange={(e) => setReportAdId(e.target.value)}
                className="h-10 w-48 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">All spots</option>
                {ads.map((a) => (
                  <option key={a.id} value={a.id}>
                    Spot {a.slot_number}
                    {a.title ? ` — ${a.title}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={runReport} disabled={reportLoading}>
              {reportLoading ? "Loading…" : "Run report"}
            </Button>
          </div>

          {clicks && (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-lg font-bold">Number of clicks: {clicks.length}</p>
                <Button variant="outline" onClick={downloadCsv} disabled={!clicks.length}>
                  Download CSV
                </Button>
                <Button variant="outline" onClick={deleteRange} disabled={!clicks.length}>
                  <Eraser className="mr-1 h-4 w-4" /> Delete these records
                </Button>
              </div>

              <div className="mt-3 max-h-80 divide-y overflow-y-auto rounded border bg-background">
                {clicks.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No clicks in this date range.</p>
                ) : (
                  clicks.map((c) => {
                    const d = new Date(c.clicked_at);
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span>
                          {d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })}{" "}
                          {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()}{" "}
                          <span className="font-semibold">{c.username ? `@${c.username}` : "guest"}</span>
                          <span className="ml-2 text-xs text-muted-foreground">Spot {slotFor(c.ad_id)}</span>
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => deleteOne(c.id)}>
                          Delete
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>


        {loading ? (
          <p className="py-8 text-center text-muted-foreground">Loading spots…</p>
        ) : (
          visible.map((ad) => {
            const index = ads.findIndex((a) => a.id === ad.id);
            return (
              <div
                key={ad.id}
                className="rounded-lg border p-3 md:grid md:grid-cols-[110px_1fr_auto] md:items-start md:gap-4"
              >
                <div className="mb-2 flex items-center gap-2 md:mb-0 md:flex-col md:items-start">
                  <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-white">
                    Spot {ad.slot_number}
                  </span>
                  <span className="text-xs text-muted-foreground">Order #{index + 1}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="outline" onClick={() => move(index, -1)} aria-label="Move up">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => move(index, 1)} aria-label="Move down">
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Title (optional)</Label>
                    <Input
                      value={ad.title || ""}
                      onChange={(e) => patch(ad.id, { title: e.target.value })}
                      placeholder="Headline shown over the ad"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Click-through link (optional)</Label>
                    <Input
                      value={ad.link_url || ""}
                      onChange={(e) => patch(ad.id, { link_url: e.target.value })}
                      placeholder="https://…"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Video / GIF / image URL</Label>
                    <Input
                      value={ad.media_url || ""}
                      onChange={(e) => patch(ad.id, { media_url: e.target.value })}
                      placeholder="https://…mp4 or .gif or .jpg"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs">Type</Label>
                    <select
                      value={ad.media_type}
                      onChange={(e) => patch(ad.id, { media_type: e.target.value as AdRow["media_type"] })}
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="image">Image</option>
                      <option value="gif">GIF</option>
                      <option value="video">Video</option>
                    </select>
                    <Label className="ml-2 text-xs">Live</Label>
                    <Switch
                      checked={ad.is_active}
                      onCheckedChange={(v) => patch(ad.id, { is_active: v })}
                    />
                  </div>
                  {ad.media_url && (
                    <div className="sm:col-span-2">
                      {ad.media_type === "video" ? (
                        <video src={ad.media_url} className="h-28 rounded border object-cover" muted controls />
                      ) : (
                        <img src={ad.media_url} alt="" className="h-28 rounded border object-cover" />
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-2 flex gap-2 md:mt-0 md:flex-col">
                  <Button onClick={() => save(ad)} disabled={savingId === ad.id}>
                    <Save className="mr-1 h-4 w-4" />
                    {savingId === ad.id ? "Saving…" : "Save"}
                  </Button>
                  <Button variant="outline" onClick={() => clear(ad)}>
                    <Eraser className="mr-1 h-4 w-4" /> Clear
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAdvertisementTab;
