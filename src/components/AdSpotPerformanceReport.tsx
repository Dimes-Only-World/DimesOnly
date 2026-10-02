import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Row {
  id: string;
  slot_number: number;
  position: number;
  title: string | null;
  is_active: boolean;
  impressions: number;
  clicks: number;
}

type SortKey = "position" | "impressions" | "clicks" | "ctr";

const ctr = (r: Row) => (r.impressions ? (r.clicks / r.impressions) * 100 : 0);

/** Impressions, clicks and click-through rate per numbered ad spot. */
const AdSpotPerformanceReport: React.FC<{ call: (a: string, e?: Record<string, unknown>) => Promise<any> }> = ({ call }) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(monthAgo);
  const [toDate, setToDate] = useState(today);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("position");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(((await call("adSpotPerformance", { fromDate, toDate })) || []) as Row[]);
    } catch (e: any) {
      setError(e.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [call, fromDate, toDate]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = [...rows].sort((a, b) =>
    sort === "position" ? a.position - b.position
      : sort === "ctr" ? ctr(b) - ctr(a)
      : (b[sort] as number) - (a[sort] as number),
  );
  const totalI = rows.reduce((s, r) => s + r.impressions, 0);
  const totalC = rows.reduce((s, r) => s + r.clicks, 0);
  const maxCtr = Math.max(0, ...rows.filter((r) => r.impressions >= 20).map(ctr));

  const exportCsv = () => {
    const lines = [
      "Feed order,Spot,Title,Active,Impressions,Clicks,CTR %",
      ...sorted.map((r, i) =>
        [r.position, r.slot_number, `"${(r.title || "").replace(/"/g, '""')}"`, r.is_active ? "yes" : "no", r.impressions, r.clicks, ctr(r).toFixed(2)].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ad-spot-performance-${fromDate}-to-${toDate}.csv`;
    a.click();
  };

  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th className="px-3 py-2 text-right">
      <button onClick={() => setSort(k)} className={`font-semibold ${sort === k ? "text-primary" : ""}`}>
        {children}{sort === k ? " ↓" : ""}
      </button>
    </th>
  );

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-bold">Ad Spot Performance</h3>
          <p className="text-xs text-muted-foreground">
            An impression is counted once per visitor session when at least half the ad is on screen.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div><Label className="text-xs">From</Label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9" /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9" /></div>
          <Button size="sm" onClick={load} disabled={loading}>{loading ? "Loading…" : "Run report"}</Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>Download CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-muted p-2"><div className="text-xs text-muted-foreground">Impressions</div><div className="text-lg font-bold">{totalI.toLocaleString()}</div></div>
        <div className="rounded-md bg-muted p-2"><div className="text-xs text-muted-foreground">Clicks</div><div className="text-lg font-bold">{totalC.toLocaleString()}</div></div>
        <div className="rounded-md bg-muted p-2"><div className="text-xs text-muted-foreground">Overall CTR</div><div className="text-lg font-bold">{totalI ? ((totalC / totalI) * 100).toFixed(2) : "0.00"}%</div></div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : rows.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground">No ad spots with activity in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left"><button onClick={() => setSort("position")} className={`font-semibold ${sort === "position" ? "text-primary" : ""}`}>Spot{sort === "position" ? " ↓" : ""}</button></th>
                <th className="px-3 py-2 text-left">Title</th>
                <Th k="impressions">Impressions</Th>
                <Th k="clicks">Clicks</Th>
                <Th k="ctr">CTR</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const c = ctr(r);
                const best = r.impressions >= 20 && c === maxCtr && maxCtr > 0;
                return (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="px-3 py-2 font-semibold">
                      Spot {r.slot_number}
                      <span className="ml-1 text-xs text-muted-foreground">· feed #{r.position}</span>
                      {!r.is_active && <span className="ml-1 text-xs text-muted-foreground">(off)</span>}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-2">{r.title || "—"}</td>
                    <td className="px-3 py-2 text-right">{r.impressions.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{r.clicks.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="hidden h-1.5 w-16 overflow-hidden rounded bg-muted sm:block">
                          <div className="h-full bg-primary" style={{ width: `${maxCtr ? Math.min(100, (c / maxCtr) * 100) : 0}%` }} />
                        </div>
                        <span className={best ? "font-bold text-primary" : ""}>{c.toFixed(2)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdSpotPerformanceReport;
