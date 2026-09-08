import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { storeAdmin } from "@/lib/storeAdmin";
import { money } from "@/lib/store";

type OrderItem = { id: string; name: string; size: string; color: string; qty: number };
type Order = {
  id: string; email: string; status: string; total_cents: number; subtotal_cents: number;
  shipping_cents: number; discount_cents: number; created_at: string;
  tracking_number: string | null; carrier: string | null;
  shipping_address: Record<string, string> | null;
  store_order_items: OrderItem[];
};

const STATUSES = ["all", "paid", "processing", "shipped", "delivered", "refunded", "cancelled"];

const AdminStoreOrders: React.FC = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { tracking: string; carrier: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await storeAdmin<{ orders: Order[] }>("listOrders", { status });
      setOrders((res.orders || []).filter((o) => o.status !== "pending"));
    } catch (e) {
      toast({ title: "Could not load orders", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [status, toast]);

  useEffect(() => { load(); }, [load]);

  const update = async (order: Order, patch: Record<string, unknown>) => {
    try {
      await storeAdmin("updateOrder", { order_id: order.id, ...patch });
      toast({ title: "Order updated" });
      load();
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Clothing Orders</CardTitle>
        <select className="rounded-md border px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p>Loading…</p> : orders.length === 0 ? <p className="text-gray-500">No orders yet.</p> : orders.map((o) => {
          const d = drafts[o.id] || { tracking: o.tracking_number || "", carrier: o.carrier || "" };
          return (
            <div key={o.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">#{o.id.slice(0, 8).toUpperCase()} · {o.email}</p>
                  <p className="text-sm text-gray-500">{new Date(o.created_at).toLocaleString()} · {money(o.total_cents)}</p>
                </div>
                <select
                  className="rounded-md border px-3 py-2 text-sm"
                  value={o.status}
                  onChange={(e) => update(o, { status: e.target.value })}
                >
                  {STATUSES.filter((s) => s !== "all").map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                {o.store_order_items?.map((i) => <div key={i.id}>{i.name} · {i.size}/{i.color} × {i.qty}</div>)}
              </div>
              {o.shipping_address && (
                <p className="mt-2 text-sm text-gray-500">
                  {o.shipping_address.full_name}, {o.shipping_address.line1} {o.shipping_address.line2} — {o.shipping_address.city}, {o.shipping_address.state} {o.shipping_address.zip}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input className="w-36" placeholder="Carrier" value={d.carrier} onChange={(e) => setDrafts({ ...drafts, [o.id]: { ...d, carrier: e.target.value } })} />
                <Input className="w-52" placeholder="Tracking number" value={d.tracking} onChange={(e) => setDrafts({ ...drafts, [o.id]: { ...d, tracking: e.target.value } })} />
                <Button size="sm" onClick={() => update(o, { carrier: d.carrier, tracking_number: d.tracking, status: "shipped" })}>Save & mark shipped</Button>
                <Button size="sm" variant="outline" onClick={() => update(o, { status: "refunded" })}>Mark refunded</Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default AdminStoreOrders;
