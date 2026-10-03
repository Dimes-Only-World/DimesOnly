import React, { useEffect, useState } from "react";
import { Download, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type Method = "all" | "paypal" | "cash" | "cashapp";
type PaymentRow = {
  id: string; booking_id: string; payment_type: "booking" | "extension"; paid_at: string;
  payment_method: Exclude<Method, "all">; amount: number; payment_reference: string | null;
  receipt_path: string | null; renter_username: string | null; vehicle_label: string;
};
type Totals = { count: number; total: number; paypal: number; cash: number; cashapp: number };

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
const label = (method: PaymentRow["payment_method"]) => method === "cashapp" ? "Cash App" : method === "cash" ? "Cash" : "PayPal";
const csvSafe = (value: unknown) => {
  const raw = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

const PaymentHistoryPanel: React.FC<{ callAdmin: (action: string, extra?: Record<string, unknown>) => Promise<any> }> = ({ callAdmin }) => {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [totals, setTotals] = useState<Totals>({ count: 0, total: 0, paypal: 0, cash: 0, cashapp: 0 });
  const [method, setMethod] = useState<Method>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      toast({ title: "Check the dates", description: "The start date must be before the end date.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await callAdmin("listPaymentHistory", { method, dateFrom: dateFrom || null, dateTo: dateTo || null });
      setRows(result?.data || []);
      setTotals(result?.totals || { count: 0, total: 0, paypal: 0, cash: 0, cashapp: 0 });
    } catch (error) {
      toast({ title: "Payment history unavailable", description: error instanceof Error ? error.message : "Could not load payments", variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [method, dateFrom, dateTo]);

  const openReceipt = async (path: string) => {
    try {
      const result = await callAdmin("signBookingDoc", { path });
      if (result?.url) window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({ title: "Receipt unavailable", description: error instanceof Error ? error.message : "Could not open receipt", variant: "destructive" });
    }
  };

  const exportCsv = () => {
    const headers = ["Paid date", "Booking code", "Renter", "Vehicle", "Payment type", "Method", "Amount", "Reference"];
    const body = rows.map((row) => [row.paid_at, row.booking_id.slice(0, 8).toUpperCase(), row.renter_username || "", row.vehicle_label, row.payment_type, label(row.payment_method), row.amount.toFixed(2), row.payment_reference || ""]);
    const csv = [headers, ...body].map((line) => line.map(csvSafe).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `rental-payments-${dateFrom || "all"}-to-${dateTo || "today"}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    toast({ title: "Payment history downloaded", description: `${rows.length} payment${rows.length === 1 ? "" : "s"} exported.` });
  };

  const totalCards = [
    ["All payments", totals.total], ["PayPal", totals.paypal], ["Cash", totals.cash], ["Cash App", totals.cashapp],
  ] as const;

  return <div className="space-y-4">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div><Label htmlFor="payment-from">From</Label><Input id="payment-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} max={dateTo || undefined} /></div>
      <div><Label htmlFor="payment-to">Through</Label><Input id="payment-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} min={dateFrom || undefined} /></div>
      <div><Label>Payment method</Label><Select value={method} onValueChange={(value) => setMethod(value as Method)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All methods</SelectItem><SelectItem value="paypal">PayPal</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="cashapp">Cash App</SelectItem></SelectContent></Select></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{totals.count} recorded payment{totals.count === 1 ? "" : "s"}</p>
      <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><FileDown className="mr-2 h-4 w-4" />Download CSV</Button>
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {totalCards.map(([title, amount]) => <Card key={title}><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">{title}</p><p className="mt-1 text-xl font-bold">{money(amount)}</p></CardContent></Card>)}
    </div>
    {loading ? <p className="py-8 text-center text-muted-foreground">Loading payments…</p> : rows.length === 0 ? <p className="py-8 text-center text-muted-foreground">No recorded payments match these filters.</p> : (
      <div className="space-y-3">{rows.map((row) => <Card key={`${row.payment_type}-${row.id}`}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{money(row.amount)}</p><Badge variant={row.payment_method === "paypal" ? "info" : row.payment_method === "cashapp" ? "success" : "secondary"}>{label(row.payment_method)}</Badge><Badge variant="outline">{row.payment_type === "extension" ? "Extension" : "Booking"}</Badge></div><p className="text-sm">{row.vehicle_label || "Vehicle"} · {row.renter_username ? `@${row.renter_username}` : "Renter"}</p><p className="text-xs text-muted-foreground">Paid {new Date(row.paid_at).toLocaleString()} · Booking {row.booking_id.slice(0, 8).toUpperCase()}</p>{row.payment_reference && <p className="break-all text-xs text-muted-foreground">Reference: {row.payment_reference}</p>}</div>
        {row.receipt_path && <Button size="sm" variant="outline" onClick={() => openReceipt(row.receipt_path as string)}><Download className="mr-2 h-4 w-4" />Receipt</Button>}
      </CardContent></Card>)}</div>
    )}
  </div>;
};

export default PaymentHistoryPanel;