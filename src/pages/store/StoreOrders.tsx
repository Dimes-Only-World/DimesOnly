import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StoreLayout from "@/components/store/StoreLayout";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/store";

type Order = {
  id: string;
  status: string;
  total_cents: number;
  created_at: string;
  tracking_number: string | null;
  carrier: string | null;
  store_order_items: { id: string; name: string; size: string; color: string; qty: number; image_path: string | null }[];
};

const StoreOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);

  useEffect(() => {
    document.title = "My orders | Dimes Only Clothing";
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setSignedIn(false); setLoading(false); return; }
      const { data } = await supabase
        .from("store_orders")
        .select("id,status,total_cents,created_at,tracking_number,carrier, store_order_items(*)")
        .neq("status", "pending")
        .order("created_at", { ascending: false });
      setOrders((data || []) as Order[]);
      setLoading(false);
    })();
  }, []);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="store-display text-3xl uppercase tracking-widest">My Orders</h1>
        {!signedIn ? (
          <p className="mt-6 text-sm" style={{ color: "hsl(var(--store-muted))" }}>
            <Link to="/login" className="underline">Sign in</Link> to see your order history.
          </p>
        ) : loading ? (
          <p className="mt-6">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="mt-6 text-sm" style={{ color: "hsl(var(--store-muted))" }}>No orders yet.</p>
        ) : (
          <div className="mt-8 space-y-6">
            {orders.map((o) => (
              <div key={o.id} className="border p-5" style={{ borderColor: "hsl(var(--store-line))" }}>
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span>#{o.id.slice(0, 8).toUpperCase()}</span>
                  <span style={{ color: "hsl(var(--store-muted))" }}>{new Date(o.created_at).toLocaleDateString()}</span>
                  <span className="uppercase tracking-widest" style={{ color: "hsl(var(--store-gold))" }}>{o.status}</span>
                  <span>{money(o.total_cents)}</span>
                </div>
                <div className="mt-4 space-y-2 text-sm" style={{ color: "hsl(var(--store-muted))" }}>
                  {o.store_order_items?.map((i) => (
                    <div key={i.id}>{i.name} · {i.size} / {i.color} × {i.qty}</div>
                  ))}
                </div>
                {o.tracking_number && (
                  <p className="mt-3 text-sm">Tracking: {o.carrier} {o.tracking_number}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </StoreLayout>
  );
};

export default StoreOrders;
