import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Car, CarFront, ChevronLeft, ChevronRight, Flame, Shirt, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaleCommissionData } from "@/components/rentals/VehicleSaleCommissionsCard";
import { MiniAvatar, SaleStatusBadge, shortDate, usd } from "@/components/rentals/saleCommissionUi";
import { buildPeriods, inPeriod, type PayPeriod } from "./payPeriods";

export type SimpleCommission = { id: string; amount: number; commission_type: string; status: string; created_at: string };
export type FlixEarning = { id: string; amount_cents: number; level: number; status: string; created_at: string; note: string | null };

type Category = "vehicle" | "rentals" | "flix" | "clothing";

interface Props {
  saleData: SaleCommissionData | null;
  rentals: SimpleCommission[];
  clothing: SimpleCommission[];
  flix: FlixEarning[];
  onMessage: (username: string) => void;
}

const CATS: Array<{ id: Category; label: string; icon: React.ElementType }> = [
  { id: "vehicle", label: "Vehicle Sales", icon: Car },
  { id: "rentals", label: "Rentals", icon: CarFront },
  { id: "flix", label: "FlameFlix", icon: Flame },
  { id: "clothing", label: "Clothing Sales", icon: Shirt },
];

const StatusPill = ({ status }: { status: string }) => {
  const s = status.toLowerCase();
  const cls = ["paid", "completed", "sold", "qualified"].includes(s)
    ? "bg-sale-sold text-background"
    : ["declined", "failed", "cancelled", "refunded"].includes(s)
      ? "bg-sale-declined text-background"
      : "bg-sale-pending text-foreground";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${cls}`}>{status || "pending"}</span>;
};

const Summary = ({ items }: { items: Array<{ label: string; value: string }> }) => (
  <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-muted/40">
    {items.map((i) => (
      <div key={i.label} className="px-3 py-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{i.label}</p>
        <p className="mt-1 text-base font-bold text-foreground sm:text-lg">{i.value}</p>
      </div>
    ))}
  </div>
);

const Empty = ({ text }: { text: string }) => <p className="py-10 text-center text-sm text-muted-foreground">{text}</p>;

const EarningsCategoryReports: React.FC<Props> = ({ saleData, rentals, clothing, flix, onMessage }) => {
  const [cat, setCat] = useState<Category>("vehicle");
  const periods = useMemo(
    () =>
      buildPeriods([
        ...(saleData?.rows || []).map((r) => r.sold_at || r.submitted_at),
        ...rentals.map((r) => r.created_at),
        ...clothing.map((r) => r.created_at),
        ...flix.map((r) => r.created_at),
      ]),
    [saleData, rentals, clothing, flix],
  );
  const [idx, setIdx] = useState(0); // 0 = current period
  const [allTime, setAllTime] = useState(false);
  const period: PayPeriod | null = allTime ? null : periods[idx] || null;

  const vehicleRows = (saleData?.rows || []).filter((r) => inPeriod(r.sold_at || r.submitted_at, period));
  const rentalRows = rentals.filter((r) => inPeriod(r.created_at, period));
  const clothingRows = clothing.filter((r) => inPeriod(r.created_at, period));
  const flixRows = flix.filter((r) => inPeriod(r.created_at, period));

  const renderReport = () => {
    if (cat === "vehicle") {
      const sold = vehicleRows.filter((r) => r.status === "sold");
      const direct = sold.filter((r) => r.level === "direct").reduce((s, r) => s + r.amount, 0);
      const upline = sold.filter((r) => r.level === "upline").reduce((s, r) => s + r.amount, 0);
      return (
        <>
          <Summary items={[{ label: "Commissions 53%", value: usd(direct) }, { label: "Overrides 5%", value: usd(upline) }, { label: "Applications", value: String(vehicleRows.length) }]} />
          {vehicleRows.length === 0 ? <Empty text="No vehicle sales in this pay period." /> : (
            <ul className="divide-y divide-border">
              {vehicleRows.map((r) => {
                const name = `${r.buyer_first} ${r.buyer_last}`.trim();
                return (
                  <li key={`${r.id}-${r.level}`} className="flex items-center gap-3 px-4 py-3">
                    <MiniAvatar src={r.buyer_avatar} name={name} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{name || "Buyer"}</p>
                      <p className="text-xs text-muted-foreground">
                        Area {r.area_code || "—"} · Applied {shortDate(r.submitted_at)}{r.sold_at ? ` · Sold ${shortDate(r.sold_at)}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.level === "direct" ? "Direct commission (53%)" : "Override (5%)"}
                        {r.via && (
                          <> via <Link to={`/profile/${r.via.username}`} className="font-semibold text-primary underline-offset-2 hover:underline">@{r.via.username}</Link></>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{r.status === "sold" ? usd(r.amount) : r.status === "declined" ? "—" : "Awaiting sale"}</p>
                      <SaleStatusBadge status={r.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      );
    }
    const rows = cat === "rentals" ? rentalRows : cat === "clothing" ? clothingRows : null;
    if (rows) {
      const isOverride = (t: string) => /upline|override/i.test(t);
      const direct = rows.filter((r) => !isOverride(r.commission_type)).reduce((s, r) => s + r.amount, 0);
      const over = rows.filter((r) => isOverride(r.commission_type)).reduce((s, r) => s + r.amount, 0);
      const labels = cat === "rentals" ? ["Direct referral", "Second-level override"] : ["Direct referral (10%)", "Override (5%)"];
      return (
        <>
          <Summary items={[{ label: "Commissions", value: usd(direct) }, { label: "Overrides", value: usd(over) }, { label: "Transactions", value: String(rows.length) }]} />
          {rows.length === 0 ? <Empty text={`No ${cat === "rentals" ? "rental" : "clothing"} commissions in this pay period.`} /> : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{isOverride(r.commission_type) ? labels[1] : labels[0]}</p>
                    <p className="text-xs text-muted-foreground">{shortDate(r.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{usd(r.amount)}</p>
                    <StatusPill status={r.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      );
    }
    const c = flixRows.filter((r) => r.level === 1).reduce((s, r) => s + r.amount_cents, 0) / 100;
    const o = flixRows.filter((r) => r.level !== 1).reduce((s, r) => s + r.amount_cents, 0) / 100;
    return (
      <>
        <Summary items={[{ label: "Commissions", value: usd(c) }, { label: "Overrides", value: usd(o) }, { label: "Subscriptions", value: String(flixRows.length) }]} />
        {flixRows.length === 0 ? <Empty text="No FlameFlix earnings in this pay period." /> : (
          <ul className="divide-y divide-border">
            {flixRows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r.level === 1 ? "Direct subscriber commission" : "Second-level override"}</p>
                  <p className="truncate text-xs text-muted-foreground">{shortDate(r.created_at)}{r.note ? ` · ${r.note}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{usd(r.amount_cents / 100)}</p>
                  <StatusPill status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  };

  return (
    <section className="overflow-hidden border-y border-border bg-card text-card-foreground sm:rounded-xl sm:border">
      <div className="flex flex-col items-center gap-3 border-b border-border px-4 py-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pay Period</p>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" aria-label="Previous pay period" disabled={allTime || idx >= periods.length - 1} onClick={() => setIdx((i) => i + 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-[200px] text-base font-bold text-foreground sm:text-lg">
            {allTime ? "All time" : period?.label}
            {!allTime && idx === 0 && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 align-middle text-[10px] font-bold uppercase text-primary-foreground">Current</span>}
          </p>
          <Button size="icon" variant="outline" aria-label="Next pay period" disabled={allTime || idx === 0} onClick={() => setIdx((i) => i - 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <button type="button" onClick={() => setAllTime((v) => !v)} className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
          {allTime ? "Back to pay periods" : "Show all time"}
        </button>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {CATS.map(({ id, label, icon: Icon }) => (
            <Button key={id} variant={cat === id ? "default" : "outline"} onClick={() => setCat(id)} className="gap-2">
              <Icon className="h-4 w-4" /> {label}
            </Button>
          ))}
        </div>
      </div>
      {renderReport()}
    </section>
  );
};

export default EarningsCategoryReports;
export { StatusPill };
export const MessageButton = ({ username, onMessage }: { username: string; onMessage: (u: string) => void }) => (
  <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onMessage(username)}>
    <MessageCircle className="h-3.5 w-3.5" /> Message
  </Button>
);
