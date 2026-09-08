import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { storeAdmin } from "@/lib/storeAdmin";
import { money } from "@/lib/store";
import { Trash2 } from "lucide-react";

type Overview = {
  today_cents: number; today_orders: number; week_cents: number;
  month_cents: number; month_orders: number;
  recent: { id: string; email: string; total_cents: number; status: string; created_at: string }[];
  low_stock: { id: string; size: string; color: string; stock: number; store_products: { name: string } | null }[];
};

type Discount = {
  id: string; code: string; type: string; value: number; min_subtotal_cents: number;
  max_uses: number | null; uses: number; active: boolean; ends_at: string | null;
};

type Customer = { email: string; orders: number; total_cents: number; last: string };
type Setting = { key: string; value: unknown };
type AuditLog = { id: string; action: string; entity: string; entity_id: string | null; created_at: string };

export const AdminStoreOverview: React.FC = () => {
  const { toast } = useToast();
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    storeAdmin<Overview>("overview")
      .then(setData)
      .catch((e) => toast({ title: "Could not load overview", description: e.message, variant: "destructive" }));
  }, [toast]);

  if (!data) return <Card><CardContent className="p-6">Loading…</CardContent></Card>;

  const tiles = [
    { label: "Sales today", value: money(data.today_cents) },
    { label: "Orders today", value: String(data.today_orders) },
    { label: "Last 7 days", value: money(data.week_cents) },
    { label: "Last 30 days", value: `${money(data.month_cents)} (${data.month_orders})` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}><CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">{t.label}</p>
            <p className="mt-1 text-xl font-semibold">{t.value}</p>
          </CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Recent orders</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.recent.length === 0 ? <p className="text-gray-500">No orders yet.</p> : data.recent.map((o) => (
            <div key={o.id} className="flex justify-between border-b py-1">
              <span>#{o.id.slice(0, 8).toUpperCase()} · {o.email}</span>
              <span>{money(o.total_cents)} · {o.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Low stock</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {data.low_stock.length === 0 ? <p className="text-gray-500">Everything is well stocked.</p> : data.low_stock.map((v) => (
            <div key={v.id} className="flex justify-between border-b py-1">
              <span>{v.store_products?.name} · {v.size}/{v.color}</span>
              <span className={v.stock === 0 ? "text-red-600" : "text-amber-600"}>{v.stock} left</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export const AdminStoreDiscounts: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Discount[]>([]);
  const [draft, setDraft] = useState({ code: "", type: "percent", value: "10", min: "0", max_uses: "" });

  const load = useCallback(async () => {
    try {
      const res = await storeAdmin<{ discounts: Discount[] }>("listDiscounts");
      setRows(res.discounts || []);
    } catch (e) {
      toast({ title: "Could not load promo codes", description: (e as Error).message, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      await storeAdmin("saveDiscount", {
        discount: {
          code: draft.code, type: draft.type, value: Number(draft.value) || 0,
          min_subtotal_cents: Math.round((parseFloat(draft.min) || 0) * 100),
          max_uses: draft.max_uses ? Number(draft.max_uses) : null, active: true,
        },
      });
      setDraft({ code: "", type: "percent", value: "10", min: "0", max_uses: "" });
      toast({ title: "Promo code saved" });
      load();
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const toggle = async (d: Discount) => {
    await storeAdmin("saveDiscount", { discount: { ...d, active: !d.active } }).catch(() => null);
    load();
  };

  const remove = async (d: Discount) => {
    await storeAdmin("deleteDiscount", { discount_id: d.id }).catch(() => null);
    load();
  };

  return (
    <Card>
      <CardHeader><CardTitle>Promo Codes</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-6">
          <Input placeholder="CODE" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} />
          <select className="rounded-md border px-3 py-2 text-sm" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            <option value="percent">% off</option>
            <option value="fixed">$ off</option>
          </select>
          <Input placeholder="Value" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
          <Input placeholder="Min subtotal $" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value })} />
          <Input placeholder="Max uses" value={draft.max_uses} onChange={(e) => setDraft({ ...draft, max_uses: e.target.value })} />
          <Button onClick={save}>Add code</Button>
        </div>
        <div className="space-y-2 text-sm">
          {rows.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 border-b py-2">
              <span className="w-28 font-medium">{d.code}</span>
              <span>{d.type === "percent" ? `${d.value}% off` : money(Math.round(d.value * 100))}</span>
              <span className="text-gray-500">used {d.uses ?? 0}{d.max_uses ? ` / ${d.max_uses}` : ""}</span>
              <Button size="sm" variant="outline" onClick={() => toggle(d)}>{d.active ? "Disable" : "Enable"}</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(d)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const AdminStoreCustomers: React.FC = () => {
  const [rows, setRows] = useState<Customer[]>([]);
  useEffect(() => { storeAdmin<{ customers: Customer[] }>("listCustomers").then((r) => setRows(r.customers || [])).catch(() => null); }, []);
  return (
    <Card>
      <CardHeader><CardTitle>Clothing Customers</CardTitle></CardHeader>
      <CardContent className="space-y-1 text-sm">
        {rows.length === 0 ? <p className="text-gray-500">No customers yet.</p> : rows.map((c) => (
          <div key={c.email} className="flex justify-between border-b py-1">
            <span>{c.email}</span>
            <span>{c.orders} orders · {money(c.total_cents)} · last {new Date(c.last).toLocaleDateString()}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export const AdminStoreSettings: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([
        storeAdmin<{ settings: Setting[] }>("getSettings"),
        storeAdmin<{ logs: AuditLog[] }>("listAuditLogs"),
      ]);
      setSettings(s.settings || []);
      setLogs(l.logs || []);
      const d: Record<string, string> = {};
      for (const row of s.settings || []) d[row.key] = JSON.stringify(row.value, null, 2);
      setDrafts(d);
    } catch (e) {
      toast({ title: "Could not load settings", description: (e as Error).message, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async (key: string) => {
    try {
      await storeAdmin("saveSetting", { key, value: JSON.parse(drafts[key]) });
      toast({ title: `${key} saved` });
      load();
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Store Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {settings.map((s) => (
            <div key={s.key}>
              <p className="mb-1 text-sm font-medium capitalize">{s.key}</p>
              <Textarea rows={4} value={drafts[s.key] || ""} onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })} />
              <Button size="sm" className="mt-2" onClick={() => save(s.key)}>Save {s.key}</Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {logs.map((l) => (
            <div key={l.id} className="flex justify-between border-b py-1">
              <span>{l.action} · {l.entity}</span>
              <span className="text-gray-500">{new Date(l.created_at).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
