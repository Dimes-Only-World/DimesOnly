import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { breakdownEntries, fmtDate, payoutMethodLabel, PAYOUT_STATUS_LABELS } from "@/lib/payouts";

const tone: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  refunded: "bg-purple-100 text-purple-800",
  failed: "bg-red-100 text-red-800",
};

const MemberPayoutHistory: React.FC<{ payouts: any[] }> = ({ payouts }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">My Payouts</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {payouts.map((p) => {
        const items = breakdownEntries(p.earnings_breakdown);
        const status = p.request_status || "pending";
        return (
          <details key={p.id} className="rounded-lg border p-3">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">${Number(p.amount).toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">{payoutMethodLabel(p.payout_method)}</span>
              <span className="text-sm text-muted-foreground">Requested {fmtDate(p.request_date || p.created_at)}</span>
              <Badge className={tone[status] || "bg-muted text-muted-foreground"}>{PAYOUT_STATUS_LABELS[status] || status}</Badge>
            </summary>
            <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
              <div><strong>Approved:</strong> {fmtDate(p.approved_at)}</div>
              <div><strong>Paid to you:</strong> {fmtDate(p.paid_at)}</div>
              {p.paid_reference && <div className="sm:col-span-2"><strong>Payment reference:</strong> {p.paid_reference}</div>}
              {status === "refunded" && (
                <div className="sm:col-span-2"><strong>Refunded {fmtDate(p.refunded_at)}:</strong> {p.refund_reason}</div>
              )}
              {status === "failed" && p.notes && <div className="sm:col-span-2"><strong>Reason:</strong> {p.notes}</div>}
            </div>
            <div className="mt-3">
              <p className="text-sm font-medium">What this payout covers</p>
              {items.length ? (
                <ul className="mt-1 text-sm">
                  {items.map(([label, v]) => (
                    <li key={label} className="flex justify-between border-b py-1 last:border-0">
                      <span>{label}</span><span>${v.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Earnings balance (details weren't recorded for older requests).</p>
              )}
            </div>
          </details>
        );
      })}
    </CardContent>
  </Card>
);

export default MemberPayoutHistory;
