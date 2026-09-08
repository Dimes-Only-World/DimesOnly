import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StoreLayout from "@/components/store/StoreLayout";
import { supabase } from "@/integrations/supabase/client";
import { useStoreCart } from "@/contexts/StoreCartContext";

const StoreOrderReturn: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { clear } = useStoreCart();
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    document.title = "Order confirmation | Dimes Only Clothing";
    if (!token) {
      setState("error");
      setMessage("We couldn't find that payment.");
      return;
    }
    supabase.functions
      .invoke("store-capture", { body: { paypal_order_id: token } })
      .then(({ data, error }) => {
        if (error || !data?.success) throw new Error(data?.error || error?.message || "Payment failed");
        setOrderId(data.order_id);
        clear();
        setState("done");
      })
      .catch((e) => {
        setState("error");
        setMessage((e as Error).message);
      });
  }, [token, clear]);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        {state === "working" && <p>Confirming your payment…</p>}
        {state === "done" && (
          <>
            <h1 className="store-display text-3xl uppercase tracking-widest">Order confirmed</h1>
            <p className="mt-4 text-sm" style={{ color: "hsl(var(--store-muted))" }}>
              Thank you. Your order {orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : ""} is being prepared.
              You'll get tracking as soon as it ships.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link to="/clothes/orders" className="px-6 py-3 text-xs uppercase tracking-widest text-white" style={{ backgroundColor: "hsl(var(--store-pink))" }}>My orders</Link>
              <Link to="/clothes/shop" className="border px-6 py-3 text-xs uppercase tracking-widest" style={{ borderColor: "hsl(var(--store-line))" }}>Keep shopping</Link>
            </div>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="store-display text-2xl uppercase tracking-widest">Payment problem</h1>
            <p className="mt-4 text-sm" style={{ color: "hsl(var(--store-muted))" }}>{message}</p>
            <Link to="/clothes/cart" className="mt-6 inline-block underline">Back to your bag</Link>
          </>
        )}
      </div>
    </StoreLayout>
  );
};

export default StoreOrderReturn;
