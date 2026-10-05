import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { payPeriodOf } from "@/lib/earningsLedger";
import type { ActivityEntry } from "./EarningsActivityFeed";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const PayPeriodSummary: React.FC<{ entries: ActivityEntry[] }> = ({ entries }) => {
  const periods = useMemo(() => {
    const map = new Map<string, { start: Date; end: Date; total: number; count: number }>();
    for (const e of entries) {
      if (!(e.commission > 0)) continue;
      const p = payPeriodOf(e.date);
      if (!p) continue;
      const row = map.get(p.key) || { start: p.start, end: p.end, total: 0, count: 0 };
      row.total += e.commission;
      row.count += 1;
      map.set(p.key, row);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entries]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Semi-Monthly Pay Periods</CardTitle>
        <p className="text-xs text-muted-foreground">1st–14th and 15th–end of month.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {periods.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No pay periods yet.</p>}
        {periods.map(([key, p]) => (
          <div key={key} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">
                {p.start.toLocaleDateString()} – {p.end.toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">{p.count} earning event{p.count === 1 ? "" : "s"}</p>
            </div>
            <p className="font-bold text-green-700">{usd(Math.round(p.total * 100) / 100)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PayPeriodSummary;
