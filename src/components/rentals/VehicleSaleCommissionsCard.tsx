import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car } from "lucide-react";
import { MiniAvatar, SaleStatusBadge, shortDate, usd } from "./saleCommissionUi";

export type SaleCommissionData = {
  rows: Array<{
    id: string; level: "direct" | "upline"; rate: number; submitted_at: string; area_code: string;
    buyer_first: string; buyer_last: string; buyer_avatar: string | null; buyer_username?: string | null; status: string; sold_at: string | null;
    amount: number; via: { username: string; avatar: string | null } | null;
  }>;
  bonuses: Array<{ month: string; amount: number; note: string | null }>;
  soldTotal: number; bonusTotal: number; total: number;
};

const VehicleSaleCommissionsCard: React.FC<{ data: SaleCommissionData | null }> = ({ data }) => {
  if (!data || (data.rows.length === 0 && data.bonuses.length === 0)) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Car className="h-4 w-4" /> Vehicle Sale Earnings</CardTitle>
        <p className="text-xs text-muted-foreground">53% on your direct referrals' vehicle purchases, 5% on your second level. Earned {usd(data.soldTotal)}{data.bonusTotal > 0 ? ` + ${usd(data.bonusTotal)} bonuses` : ""}.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.rows.map((r) => {
          const name = `${r.buyer_first} ${r.buyer_last}`.trim();
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
              <MiniAvatar src={r.buyer_avatar} name={name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{name || "Buyer"} <span className="text-xs text-muted-foreground">· Area {r.area_code || "—"}</span></p>
                <p className="text-xs text-muted-foreground">Applied {shortDate(r.submitted_at)}{r.sold_at ? ` · Sold ${shortDate(r.sold_at)}` : ""}</p>
                {r.level === "upline" && r.via && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><span>via</span><MiniAvatar src={r.via.avatar} name={r.via.username} size={18} /><span>@{r.via.username}</span></div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{r.status === "sold" ? usd(r.amount) : r.status === "declined" ? "—" : "Awaiting sale"}</p>
                <p className="mb-1 text-[10px] text-muted-foreground">{Math.round(r.rate * 100)}% {r.level === "direct" ? "direct" : "2nd level"}</p>
                <SaleStatusBadge status={r.status} />
              </div>
            </div>
          );
        })}
        {data.bonuses.map((b) => (
          <div key={b.month} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
            <span>Top earner bonus · {new Date(`${b.month}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            <span className="font-bold text-sale-sold">{usd(b.amount)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default VehicleSaleCommissionsCard;
