import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MiniAvatar } from "@/components/rentals/saleCommissionUi";

export type ActivityEntry = {
  id: string;
  date: string;
  type: string;
  payer: string | null;
  avatar?: string | null;
  gross: number | null;
  commission: number;
  status?: string | null;
};

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const EarningsActivityFeed: React.FC<{ entries: ActivityEntry[] }> = ({ entries }) => {
  const [limit, setLimit] = useState(25);
  const sorted = useMemo(
    () => [...entries].filter((e) => e.commission > 0).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [entries],
  );
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Activity Feed</CardTitle>
        <p className="text-xs text-muted-foreground">Every earning event, newest first.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No earnings yet.</p>}
        {sorted.slice(0, limit).map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-lg border p-3">
            <MiniAvatar src={e.avatar ?? null} name={e.payer || e.type} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {e.type}
                {e.payer && <span className="text-muted-foreground"> · @{e.payer}</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {e.date ? new Date(e.date).toLocaleDateString() : "—"}
                {e.gross != null && ` · Gross ${usd(e.gross)}`}
                {e.status && ` · ${e.status}`}
              </p>
            </div>
            <p className="font-bold text-green-700">{usd(e.commission)}</p>
          </div>
        ))}
        {sorted.length > limit && (
          <Button variant="outline" className="w-full" onClick={() => setLimit((l) => l + 25)}>
            Show more
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EarningsActivityFeed;
