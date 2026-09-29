import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift } from "lucide-react";
import { callRewards, REWARD_CATEGORIES } from "@/lib/rewards";

interface Data {
  won: { id: string; title: string; prize_amount: number; prize_label: string | null; paid_at: string | null; category: string }[];
  paidTotal: number; pendingTotal: number;
  standing: { id: string; title: string; rank: number; participants: number; category: string; prize_amount: number }[];
}
const money = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BonusBox: React.FC = () => {
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => { callRewards<Data>("myBonuses").then(setD).catch(() => setD({ won: [], paidTotal: 0, pendingTotal: 0, standing: [] })); }, []);

  return (
    <div className="flex justify-center">
      <Card className="w-full border-yellow-300 bg-gradient-to-br from-yellow-50 to-fuchsia-50 md:w-1/2 xl:w-1/3">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-center gap-2 text-sm font-medium text-fuchsia-700"><Gift className="h-4 w-4" />Bonus Box</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-2xl font-bold text-fuchsia-800">{money((d?.paidTotal || 0) + (d?.pendingTotal || 0))}</div>
          <p className="text-sm text-fuchsia-600">Paid {money(d?.paidTotal || 0)} · Pending {money(d?.pendingTotal || 0)}</p>
          {!!d?.won.length && (
            <ul className="mt-3 space-y-1 text-left text-sm">
              {d.won.slice(0, 5).map((w) => (
                <li key={w.id} className="flex justify-between gap-2"><span className="truncate">{REWARD_CATEGORIES[w.category]?.icon} {w.title}</span>
                  <span className={w.paid_at ? "text-green-700" : "text-yellow-700"}>{w.prize_label || money(w.prize_amount)}</span></li>
              ))}
            </ul>
          )}
          {!!d?.standing.length && (
            <div className="mt-3 border-t border-yellow-200 pt-2 text-left text-sm">
              <p className="mb-1 font-semibold text-fuchsia-700">Contests you're in</p>
              {d.standing.map((s) => (
                <p key={s.id} className="flex justify-between gap-2"><span className="truncate">{s.title}</span><span className="font-mono text-fuchsia-800">#{s.rank} of {s.participants}</span></p>
              ))}
            </div>
          )}
          {d && !d.won.length && !d.standing.length && <p className="mt-2 text-xs text-muted-foreground">Join a live contest on your dashboard to win bonuses.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default BonusBox;
