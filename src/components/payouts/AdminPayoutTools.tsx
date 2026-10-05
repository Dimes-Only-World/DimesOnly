import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Download, RefreshCw, Send } from "lucide-react";
import { sumAmounts, toCsv } from "@/lib/payouts";
import { buildNacha, validRouting, type NachaConfig, type NachaEntry } from "@/lib/nacha";

type Req = {
  id: string; username: string; email: string; amount: number; payout_method: string;
  paypal_email: string | null; notes: string | null;
  wire_routing_number: string | null; wire_account_number: string | null; wire_account_holder_name: string | null; wire_account_type: string | null;
  cashapp_cashtag: string | null; cashapp_email: string | null; cashapp_phone: string | null;
};

type Fin = {
  totalVolume: number; commissionsOwed: number; commissionsPaid: number; netProfit: number;
  streams: { stream: string; gross: number; keepRate: number; companyProfit: number }[]; asOf: string;
};

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const LABEL: Record<string, string> = { tips: "Tips", rentals: "Car Rentals", car_sales: "Car Sales", clothing: "Clothing", memberships: "Memberships", tickets: "Event Tickets", flameflix: "FlameFlix" };
const NACHA_KEY = "dow-nacha-config";

const download = (name: string, text: string, type = "text/csv") => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};
const today = () => new Date().toISOString().slice(0, 10);
const parseNotes = (n: string | null) => { try { return n ? JSON.parse(n) : {}; } catch { return {}; } };

interface Props { approved: Req[]; adminUserId: () => string | null; onDone: () => void }

const AdminPayoutTools: React.FC<Props> = ({ approved, adminUserId, onDone }) => {
  const [fin, setFin] = useState<Fin | null>(null);
  const [finLoading, setFinLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [nachaOpen, setNachaOpen] = useState(false);
  const [cfg, setCfg] = useState<NachaConfig>(() => {
    try { return JSON.parse(localStorage.getItem(NACHA_KEY) || "") as NachaConfig; } catch { return { companyName: "", companyId: "", originRouting: "", originBankName: "" }; }
  });

  const loadFin = async () => {
    setFinLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-data", { body: { action: "companyFinancials", adminUserId: adminUserId() } });
    setFinLoading(false);
    if (error || !data?.data) return toast.error("Could not load company financials");
    setFin(data.data);
  };
  useEffect(() => { loadFin(); }, []);

  const paypal = approved.filter((p) => p.payout_method === "paypal" && p.paypal_email);
  const venmo = approved.filter((p) => p.payout_method === "venmo");
  const cashapp = approved.filter((p) => p.payout_method === "cashapp" || p.cashapp_cashtag);
  const ach = approved.filter((p) => p.payout_method === "direct_deposit");

  const runPaypalBatch = async () => {
    if (!paypal.length) return toast.info("No approved PayPal payouts with a PayPal email");
    if (!confirm(`Send ${paypal.length} PayPal payout(s) totaling ${usd(sumAmounts(paypal))} now? Money leaves your PayPal balance immediately.`)) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-data", {
      body: { action: "executePaypalBatch", adminUserId: adminUserId(), requestIds: paypal.map((p) => p.id) },
    });
    setSending(false);
    const msg = data?.error || (error as any)?.context?.error || error?.message;
    if (error || !data?.data?.success) return toast.error("PayPal batch failed: " + (msg || "Unknown error"));
    toast.success(`Sent ${data.data.paid} PayPal payout(s) · batch ${data.data.payoutBatchId}`);
    onDone();
    loadFin();
  };

  const venmoCsv = () => {
    if (!venmo.length) return toast.info("No approved Venmo payouts");
    const rows = venmo.map((p) => { const n = parseNotes(p.notes); return [n.username || n.venmo_username || "", n.phone || n.venmo_phone || "", n.email || n.venmo_email || "", Number(p.amount).toFixed(2), `Dimes Only payout @${p.username}`]; });
    download(`venmo-batch-${today()}.csv`, toCsv(["Username", "Phone", "Email", "Amount", "Note"], rows));
  };

  const cashappCsv = () => {
    if (!cashapp.length) return toast.info("No approved Cash App payouts");
    const rows = cashapp.map((p) => [p.cashapp_cashtag || "", p.cashapp_phone || "", p.cashapp_email || "", Number(p.amount).toFixed(2), `Dimes Only payout @${p.username}`]);
    download(`cashapp-batch-${today()}.csv`, toCsv(["$Cashtag", "Phone", "Email", "Amount", "Note"], rows));
  };

  const nachaExport = () => {
    if (!cfg.companyName || !/^\w{10}$/.test(cfg.companyId) || !validRouting(cfg.originRouting) || !cfg.originBankName) {
      return toast.error("Enter company name, 10-character company ID, a valid bank routing number, and bank name");
    }
    localStorage.setItem(NACHA_KEY, JSON.stringify(cfg));
    const entries: NachaEntry[] = [];
    const skipped: string[] = [];
    for (const p of ach) {
      const n = parseNotes(p.notes);
      const routing = String(n.routing_number || p.wire_routing_number || "").replace(/\D/g, "");
      const account = String(n.account_number || p.wire_account_number || "").replace(/\D/g, "");
      if (!validRouting(routing) || !account) { skipped.push(p.username); continue; }
      entries.push({ name: p.wire_account_holder_name || p.username, routing, account, type: p.wire_account_type === "savings" ? "savings" : "checking", amount: Number(p.amount), id: p.id.replace(/-/g, "").slice(0, 15) });
    }
    if (!entries.length) return toast.error("No approved direct deposit payouts with valid bank details");
    const eff = new Date(); eff.setDate(eff.getDate() + 1);
    const { text, totalCents } = buildNacha(cfg, entries, eff);
    download(`ach-payroll-${today()}.txt`, text, "text/plain");
    toast.success(`NACHA file: ${entries.length} payment(s), ${usd(totalCents / 100)}${skipped.length ? ` · skipped ${skipped.join(", ")} (bad bank details)` : ""}`);
    setNachaOpen(false);
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-primary/40">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Company Profit & Revenue</CardTitle>
          <Button size="sm" variant="ghost" onClick={loadFin} disabled={finLoading}><RefreshCw className={`h-4 w-4 ${finLoading ? "animate-spin" : ""}`} /></Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Gross Platform Volume", fin?.totalVolume],
              ["Member Payouts Owed", fin?.commissionsOwed],
              ["Member Payouts Paid", fin?.commissionsPaid],
              ["Est. Net Company Profit", fin?.netProfit],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className="text-xl font-bold">{v == null ? "—" : usd(v as number)}</p>
              </div>
            ))}
          </div>
          {fin && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground"><th className="py-1">Stream</th><th>Gross</th><th>Company keeps</th><th className="text-right">Company profit</th></tr></thead>
                <tbody>
                  {fin.streams.map((s) => (
                    <tr key={s.stream} className="border-t"><td className="py-1">{LABEL[s.stream] || s.stream}</td><td>{usd(s.gross)}</td><td>{Math.round(s.keepRate * 100)}%</td><td className="text-right font-medium">{usd(s.companyProfit)}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">Estimate using each stream's company share. Payment processor fees aren't tracked per sale, so they're not subtracted.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Pay Approved Members</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button onClick={runPaypalBatch} disabled={sending || !paypal.length} className="gap-2"><Send className="h-4 w-4" />PayPal Batch ({paypal.length} · {usd(sumAmounts(paypal))})</Button>
          <Button variant="outline" onClick={() => setNachaOpen(true)} disabled={!ach.length} className="gap-2"><Building2 className="h-4 w-4" />ACH Bank File ({ach.length})</Button>
          <Button variant="outline" onClick={venmoCsv} disabled={!venmo.length} className="gap-2"><Download className="h-4 w-4" />Venmo CSV ({venmo.length})</Button>
          <Button variant="outline" onClick={cashappCsv} disabled={!cashapp.length} className="gap-2"><Download className="h-4 w-4" />Cash App CSV ({cashapp.length})</Button>
          <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">Uses requests that are approved and match the current filters. PayPal batch pays and marks them Paid automatically. For ACH, Venmo, and Cash App, upload the file, then use Mark All Paid. Members get an email when payouts are approved, paid, or refunded.</p>
        </CardContent>
      </Card>

      <Dialog open={nachaOpen} onOpenChange={setNachaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>ACH / Direct Deposit Bank File</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Your bank gives you these details when you enroll in ACH payroll. They're saved on this device only.</p>
          <div className="space-y-3">
            {([
              ["companyName", "Company name (as on bank account)"],
              ["companyId", "Company ID (10 characters, usually 1 + EIN)"],
              ["originRouting", "Your bank's routing number"],
              ["originBankName", "Your bank's name"],
            ] as const).map(([k, l]) => (
              <div key={k}><Label>{l}</Label><Input value={cfg[k]} onChange={(e) => setCfg({ ...cfg, [k]: e.target.value })} /></div>
            ))}
          </div>
          <DialogFooter><Button onClick={nachaExport}>Download bank file</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayoutTools;
