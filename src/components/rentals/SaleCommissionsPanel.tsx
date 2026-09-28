import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { MiniAvatar, SaleStatusBadge, shortDate, usd } from "./saleCommissionUi";

type Row = {
  id: string; submitted_at: string; sale_status: string; sale_amount: number | null; sold_at: string | null;
  buyer_first: string; buyer_last: string; buyer_avatar: string | null; area_code: string;
  referrer_id: string | null; upline_id: string | null; referrer_commission: number; upline_commission: number; referrer_overridden: boolean;
};
type UserInfo = { username: string; avatar: string | null };

const thisMonth = () => new Date().toISOString().slice(0, 7);

const Person = ({ u }: { u?: UserInfo | null }) => u
  ? <div className="flex items-center gap-2"><MiniAvatar src={u.avatar} name={u.username} size={28} /><span className="text-sm">@{u.username}</span></div>
  : <span className="text-sm text-muted-foreground">Company</span>;

const SaleCommissionsPanel: React.FC<{ callAdmin: (action: string, extra?: Record<string, any>) => Promise<any> }> = ({ callAdmin }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [month, setMonth] = useState(thisMonth());
  const [loading, setLoading] = useState(true);
  const [sellRow, setSellRow] = useState<Row | null>(null);
  const [sellAmount, setSellAmount] = useState("");
  const [sellDate, setSellDate] = useState(new Date().toISOString().slice(0, 10));
  const [refRow, setRefRow] = useState<Row | null>(null);
  const [refName, setRefName] = useState("");
  const [bonusInput, setBonusInput] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await callAdmin("listSaleCommissions");
      setRows(r?.data || []); setUsers(r?.users || {}); setBonuses(r?.bonuses || []);
    } catch (e: any) { toast({ title: "Could not load sale commissions", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const run = async (action: string, extra: Record<string, any>, ok: string) => {
    setBusy(true);
    try { await callAdmin(action, extra); toast({ title: ok }); await load(); return true; }
    catch (e: any) { toast({ title: "Not saved", description: e.message, variant: "destructive" }); return false; }
    finally { setBusy(false); }
  };

  const monthBonuses = bonuses.filter((b) => String(b.month).slice(0, 7) === month);
  const summarize = (list: Row[], bonusList: any[]) => {
    const sold = list.filter((r) => r.sale_status === "sold");
    const received = sold.reduce((s, r) => s + Number(r.sale_amount || 0), 0);
    const commissions = sold.reduce((s, r) => s + r.referrer_commission + r.upline_commission, 0);
    const bonus = bonusList.reduce((s, b) => s + Number(b.amount || 0), 0);
    return { count: sold.length, received, commissions, bonus, net: received - commissions - bonus };
  };
  const all = useMemo(() => summarize(rows, bonuses), [rows, bonuses]);
  const monthly = useMemo(() => summarize(rows.filter((r) => r.sale_status === "sold" && (r.sold_at || "").slice(0, 7) === month), monthBonuses), [rows, monthBonuses, month]);

  const leaders = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of rows) {
      if (r.sale_status !== "sold" || (r.sold_at || "").slice(0, 7) !== month) continue;
      if (r.referrer_id) totals[r.referrer_id] = (totals[r.referrer_id] || 0) + r.referrer_commission;
      if (r.upline_id) totals[r.upline_id] = (totals[r.upline_id] || 0) + r.upline_commission;
    }
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows, month]);

  const Summary = ({ label, s }: { label: string; s: ReturnType<typeof summarize> }) => (
    <Card><CardHeader className="pb-2"><CardTitle className="text-base">{label}</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
        <div><p className="text-muted-foreground">Sales</p><p className="text-lg font-bold">{s.count}</p></div>
        <div><p className="text-muted-foreground">Received from broker</p><p className="text-lg font-bold">{usd(s.received)}</p></div>
        <div><p className="text-muted-foreground">Commissions</p><p className="text-lg font-bold">−{usd(s.commissions)}</p></div>
        <div><p className="text-muted-foreground">Bonuses</p><p className="text-lg font-bold">−{usd(s.bonus)}</p></div>
        <div><p className="text-muted-foreground">Net profit</p><p className="text-lg font-bold text-sale-sold">{usd(s.net)}</p></div>
      </CardContent></Card>
  );

  if (loading) return <p className="text-muted-foreground">Loading sale commissions…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1"><Label>Month</Label><Input type="month" value={month} onChange={(e) => setMonth(e.target.value || thisMonth())} className="w-44" /></div>
        <p className="text-xs text-muted-foreground">Referrer earns 53% and the referrer's referrer earns 5% of the amount received from the broker.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2"><Summary label="All-time net profit" s={all} /><Summary label={`Net profit · ${month}`} s={monthly} /></div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Top earners bonus · {month}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {leaders.length === 0 && <p className="text-sm text-muted-foreground">No sold vehicles this month yet.</p>}
          {leaders.map(([uid, total], i) => {
            const existing = monthBonuses.find((b) => b.user_id === uid);
            const val = bonusInput[uid] ?? (existing ? String(existing.amount) : "");
            return (
              <div key={uid} className="flex flex-wrap items-center gap-3 border-b border-border py-2 last:border-0">
                <span className="w-6 font-bold">#{i + 1}</span>
                <Person u={users[uid]} />
                <span className="text-sm text-muted-foreground">earned {usd(total)}</span>
                <div className="ml-auto flex items-center gap-2">
                  <Input type="number" min="0" step="0.01" placeholder="Bonus $" value={val} onChange={(e) => setBonusInput((c) => ({ ...c, [uid]: e.target.value }))} className="w-28" />
                  <Button size="sm" disabled={busy || val === ""} onClick={() => run("saveSaleBonus", { userId: uid, month, amount: Number(val) }, "Bonus saved")}>Save</Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Earnings report</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr><th className="p-3">Received</th><th className="p-3">Buyer</th><th className="p-3">Area</th><th className="p-3">Referrer (53%)</th><th className="p-3">Referrer's referrer (5%)</th><th className="p-3">From broker</th><th className="p-3">Sold</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const name = `${r.buyer_first} ${r.buyer_last}`.trim();
                return (
                  <tr key={r.id} className="border-b border-border align-middle last:border-0">
                    <td className="p-3 whitespace-nowrap">{shortDate(r.submitted_at)}</td>
                    <td className="p-3"><div className="flex items-center gap-2"><MiniAvatar src={r.buyer_avatar} name={name} /><span>{name || "—"}</span></div></td>
                    <td className="p-3">{r.area_code || "—"}</td>
                    <td className="p-3"><Person u={r.referrer_id ? users[r.referrer_id] : null} />{r.referrer_id && <p className="mt-1 text-xs font-semibold">{usd(r.referrer_commission)}</p>}{r.referrer_overridden && <p className="text-[10px] text-muted-foreground">Changed by admin</p>}</td>
                    <td className="p-3">{r.referrer_id ? <><Person u={r.upline_id ? users[r.upline_id] : null} />{r.upline_id && <p className="mt-1 text-xs font-semibold">{usd(r.upline_commission)}</p>}</> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-3">{r.sale_amount ? usd(r.sale_amount) : "—"}</td>
                    <td className="p-3 whitespace-nowrap">{shortDate(r.sold_at)}</td>
                    <td className="p-3"><SaleStatusBadge status={r.sale_status} /></td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" onClick={() => { setSellRow(r); setSellAmount(r.sale_amount ? String(r.sale_amount) : ""); setSellDate(r.sold_at || new Date().toISOString().slice(0, 10)); }}>{r.sale_status === "sold" ? "Edit sale" : "Mark sold"}</Button>
                        {r.sale_status !== "declined" && <Button size="sm" variant="outline" disabled={busy} onClick={() => confirm("Mark this sale as declined?") && run("setSaleStatus", { id: r.id, saleStatus: "declined" }, "Marked declined")}>Decline</Button>}
                        {r.sale_status !== "pending" && <Button size="sm" variant="outline" disabled={busy} onClick={() => run("setSaleStatus", { id: r.id, saleStatus: "pending" }, "Set back to pending")}>Pending</Button>}
                        <Button size="sm" variant="ghost" onClick={() => { setRefRow(r); setRefName(r.referrer_id ? users[r.referrer_id]?.username || "" : "Company"); }}>Change referrer</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No credit applications yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!sellRow} onOpenChange={(o) => !o && setSellRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record sale</DialogTitle><DialogDescription>Enter the amount received from the broker. Commissions are calculated automatically.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Amount received *</Label><Input type="number" min="0" step="0.01" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} /></div>
            <div className="space-y-1"><Label>Date sold</Label><Input type="date" value={sellDate} onChange={(e) => setSellDate(e.target.value)} /></div>
            {Number(sellAmount) > 0 && sellRow && <p className="text-sm text-muted-foreground">
              Referrer: {sellRow.referrer_id ? usd(Number(sellAmount) * 0.53) : "Company (no payout)"} · Referrer's referrer: {sellRow.upline_id ? usd(Number(sellAmount) * 0.05) : "none"}
            </p>}
            <Button className="w-full" disabled={busy || !(Number(sellAmount) > 0)} onClick={async () => { if (sellRow && await run("markSaleSold", { id: sellRow.id, amount: Number(sellAmount), soldAt: sellDate }, "Sale recorded")) setSellRow(null); }}>Save as sold</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!refRow} onOpenChange={(o) => !o && setRefRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change referrer</DialogTitle><DialogDescription>Enter a member's username, or "Company". The referrer's referrer updates automatically.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Input value={refName} onChange={(e) => setRefName(e.target.value)} placeholder="username" maxLength={100} />
            <Button className="w-full" disabled={busy || !refName.trim()} onClick={async () => { if (refRow && await run("changeSaleReferrer", { id: refRow.id, username: refName.trim() }, "Referrer updated")) setRefRow(null); }}>Save referrer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SaleCommissionsPanel;
