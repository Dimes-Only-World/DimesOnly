import React from "react";
import { Wallet, Hourglass, BadgeCheck, TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

interface Props {
  available: number;
  inProcessing: number;
  paid: number;
  totalEarned: number;
}

const cards = [
  { key: "available", label: "Available for Payout", note: "Ready to cash out now", Icon: Wallet, cls: "border-green-300 bg-green-50 text-green-800" },
  { key: "inProcessing", label: "In Processing", note: "Requested, awaiting admin", Icon: Hourglass, cls: "border-yellow-300 bg-yellow-50 text-yellow-800" },
  { key: "paid", label: "Total Paid to Date", note: "PayPal, Venmo, ACH, wire, check", Icon: BadgeCheck, cls: "border-blue-300 bg-blue-50 text-blue-800" },
  { key: "totalEarned", label: "Total Gross Earned", note: "All-time earnings", Icon: TrendingUp, cls: "border-purple-300 bg-purple-50 text-purple-800" },
] as const;

export const EARNINGS_RULES: Array<[string, string[]]> = [
  ["Tips", ["60% to the performer", "5% referrer override", "Payment fees and remainder to the company"]],
  ["Vehicle Sales", ["53% direct ($530 on a $1,000 broker fee)", "5% upline override ($50)"]],
  ["Rentals & Clothing", ["10% direct", "5% upline override"]],
  ["FlameFlix", ["10% direct", "5% upline override"]],
  ["Payouts", ["$250 minimum", "Paid on the 1st and 15th", "Available = Total Earned − (Pending + Approved + Paid)", "Rejected or refunded requests return to Available\nMORE MONEY COMING SOON!"]],
];

export const EarningsRulesDrawer: React.FC = () => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline" size="sm" className="gap-2">
        <Info className="h-4 w-4" /> How my earnings are calculated
      </Button>
    </SheetTrigger>
    <SheetContent className="overflow-y-auto">
      <SheetHeader>
        <SheetTitle>How my earnings are calculated</SheetTitle>
      </SheetHeader>
      <div className="mt-4 space-y-4">
        {EARNINGS_RULES.map(([title, lines]) => (
          <div key={title} className="rounded-lg border p-3">
            <p className="font-semibold">{title}</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
              {lines.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </SheetContent>
  </Sheet>
);

const EarningsLedgerCards: React.FC<Props> = (p) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map(({ key, label, note, Icon, cls }) => (
        <div key={key} className={`rounded-xl border-2 p-4 ${cls}`}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <Icon className="h-4 w-4" /> {label}
          </div>
          <p className="mt-2 text-2xl font-bold">{usd(p[key])}</p>
          <p className="text-xs opacity-80">{note}</p>
        </div>
      ))}
    </div>
    <div className="flex justify-end"><EarningsRulesDrawer /></div>
  </div>
);

export default EarningsLedgerCards;
