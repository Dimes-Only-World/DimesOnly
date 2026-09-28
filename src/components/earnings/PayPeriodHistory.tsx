import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaleCommissionData } from "@/components/rentals/VehicleSaleCommissionsCard";
import { MiniAvatar, shortDate, usd } from "@/components/rentals/saleCommissionUi";
import { MessageButton, StatusPill, type FlixEarning, type SimpleCommission } from "./EarningsCategoryReports";
import { periodOf, type PayPeriod } from "./payPeriods";

export type HistoryTip = { id: string; created_at: string; amount: number; role: "performer" | "referral"; counterparty?: string | null; status?: string | null };
export type HistoryReferral = { id: string; created_at: string | null; amount: number; payment_type: string; username: string | null; avatar: string | null; status?: string | null };
export type HistoryWeekly = { id: string; week_start: string; bonus_earnings: number };

type Line = {
  id: string; date: string; category: string; description: string; amount: number; status: string;
  username?: string | null; avatar?: string | null; name?: string | null;
};

interface Props {
  tips: HistoryTip[];
  referrals: HistoryReferral[];
  weekly: HistoryWeekly[];
  saleData: SaleCommissionData | null;
  rentals: SimpleCommission[];
  clothing: SimpleCommission[];
  flix: FlixEarning[];
  onMessage: (username: string) => void;
}

const CATEGORY_ORDER = ["Tips", "Referrals", "Jackpot", "Vehicle Sales", "Rentals", "FlameFlix", "Clothing"];

const PayPeriodHistory: React.FC<Props> = ({ tips, referrals, weekly, saleData, rentals, clothing, flix, onMessage }) => {
  const [open, setOpen] = useState<string | null>(null);

  const groups = useMemo(() => {
    const lines: Line[] = [];
    tips.forEach((t) => lines.push({
      id: `t-${t.id}`, date: t.created_at, category: "Tips", amount: t.amount, status: t.status || "completed",
      description: t.role === "performer" ? "Tip received" : "Tip referral commission", username: t.counterparty,
    }));
    referrals.forEach((r) => r.created_at && lines.push({
      id: `r-${r.id}`, date: r.created_at, category: "Referrals", amount: r.amount, status: r.status || "completed",
      description: `${(r.payment_type || "membership").replace(/_/g, " ")} referral`, username: r.username, avatar: r.avatar,
    }));
    weekly.forEach((w) => Number(w.bonus_earnings) > 0 && lines.push({
      id: `j-${w.id}`, date: w.week_start, category: "Jackpot", amount: Number(w.bonus_earnings), status: "completed", description: "Jackpot winnings",
    }));
    (saleData?.rows || []).filter((r) => r.status === "sold" && r.sold_at).forEach((r) => lines.push({
      id: `v-${r.id}-${r.level}`, date: r.sold_at as string, category: "Vehicle Sales", amount: r.amount, status: "sold",
      description: r.level === "direct" ? "Vehicle sale commission (53%)" : "Vehicle sale override (5%)",
      name: `${r.buyer_first} ${r.buyer_last}`.trim(), avatar: r.level === "direct" ? r.buyer_avatar : r.via?.avatar,
      username: r.level === "upline" ? r.via?.username : null,
    }));
    (saleData?.bonuses || []).forEach((b, i) => lines.push({
      id: `vb-${i}`, date: `${b.month.slice(0, 7)}-15`, category: "Vehicle Sales", amount: b.amount, status: "paid", description: b.note || "Top earner bonus",
    }));
    rentals.forEach((r) => lines.push({
      id: `re-${r.id}`, date: r.created_at, category: "Rentals", amount: r.amount, status: r.status,
      description: /upline|override/i.test(r.commission_type) ? "Rental override" : "Rental commission",
    }));
    clothing.forEach((r) => lines.push({
      id: `c-${r.id}`, date: r.created_at, category: "Clothing", amount: r.amount, status: r.status,
      description: /upline/i.test(r.commission_type) ? "Clothing override (5%)" : "Clothing commission (10%)",
    }));
    flix.forEach((r) => lines.push({
      id: `f-${r.id}`, date: r.created_at, category: "FlameFlix", amount: r.amount_cents / 100, status: r.status,
      description: r.level === 1 ? "FlameFlix commission" : "FlameFlix override",
    }));

    const map = new Map<string, { period: PayPeriod; lines: Line[] }>();
    lines.forEach((l) => {
      const p = periodOf(l.date);
      if (!p) return;
      if (!map.has(p.key)) map.set(p.key, { period: p, lines: [] });
      map.get(p.key)!.lines.push(l);
    });
    return [...map.values()]
      .sort((a, b) => (a.period.key < b.period.key ? 1 : -1))
      .map((g) => {
        g.lines.sort((a, b) => (a.date < b.date ? 1 : -1));
        const byCat: Record<string, number> = {};
        g.lines.forEach((l) => { byCat[l.category] = (byCat[l.category] || 0) + l.amount; });
        return { ...g, byCat, total: g.lines.reduce((s, l) => s + l.amount, 0) };
      });
  }, [tips, referrals, weekly, saleData, rentals, clothing, flix]);

  const downloadCsv = (g: (typeof groups)[number]) => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Date", "Category", "Description", "Username", "Buyer", "Status", "Amount"],
      ...g.lines.map((l) => [shortDate(l.date), l.category, l.description, l.username || "", l.name || "", l.status, l.amount.toFixed(2)])];
    const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pay-period-${g.period.start}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (groups.length === 0) {
    return <p className="border-y border-border bg-card py-10 text-center text-sm text-muted-foreground sm:rounded-xl sm:border">No earnings history yet</p>;
  }

  return (
    <div className="space-y-3">
      {groups.map((g, i) => {
        const isOpen = open ? open === g.period.key : i === 0;
        return (
          <section key={g.period.key} className="overflow-hidden border-y border-border bg-card text-card-foreground sm:rounded-xl sm:border">
            <button type="button" onClick={() => setOpen(isOpen ? "__none" : g.period.key)} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pay period</p>
                  <p className="font-bold text-foreground">{g.period.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{usd(g.total)}</p>
                  <p className="text-xs text-muted-foreground">{g.lines.length} item{g.lines.length === 1 ? "" : "s"}</p>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            {isOpen && (
              <>
                <div className="grid grid-cols-2 gap-px border-y border-border bg-border sm:grid-cols-4">
                  {CATEGORY_ORDER.map((c) => (
                    <div key={c} className="bg-muted/40 px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c}</p>
                      <p className="text-sm font-bold text-foreground">{usd(g.byCat[c] || 0)}</p>
                    </div>
                  ))}
                  <div className="bg-primary px-3 py-2.5 text-primary-foreground">
                    <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Period total</p>
                    <p className="text-sm font-bold">{usd(g.total)}</p>
                  </div>
                </div>
                <ul className="divide-y divide-border">
                  {g.lines.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <MiniAvatar src={l.avatar} name={l.username || l.name || l.category} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{l.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {shortDate(l.date)} · {l.category}
                          {l.name ? ` · ${l.name}` : ""}
                          {l.username && (
                            <> · <Link to={`/profile/${l.username}`} className="font-semibold text-primary underline-offset-2 hover:underline">@{l.username}</Link></>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {l.username && <MessageButton username={l.username} onMessage={onMessage} />}
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{usd(l.amount)}</p>
                          <StatusPill status={l.status} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end border-t border-border px-4 py-3">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadCsv(g)}>
                    <Download className="h-3.5 w-3.5" /> Download statement
                  </Button>
                </div>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default PayPeriodHistory;
