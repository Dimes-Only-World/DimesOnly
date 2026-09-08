import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import StoreLayout from "@/components/store/StoreLayout";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { defaultShipping, fetchStoreSettings, money } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const StoreCheckout: React.FC = () => {
  const { lines, subtotal } = useStoreCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipping, setShipping] = useState(defaultShipping);
  const [method, setMethod] = useState<"standard" | "express">("standard");
  const [promo, setPromo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "", full_name: "", line1: "", line2: "", city: "", state: "", zip: "",
  });

  useEffect(() => {
    document.title = "Checkout | Dimes Only Clothing";
    fetchStoreSettings().then((s) => { if (s.shipping) setShipping({ ...defaultShipping, ...s.shipping }); });
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      if (data.user?.email) setForm((f) => ({ ...f, email: data.user!.email as string }));
    });
  }, []);

  const shippingCents = useMemo(() => {
    if (method === "express") return shipping.express_cents;
    return subtotal >= shipping.free_threshold_cents ? 0 : shipping.standard_cents;
  }, [method, shipping, subtotal]);

  const total = subtotal + shippingCents;

  const pay = async () => {
    if (!lines.length) return;
    for (const key of ["email", "full_name", "line1", "city", "state", "zip"] as const) {
      if (!form[key].trim()) {
        toast({ title: "Please complete your shipping details", variant: "destructive" });
        return;
      }
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("store-checkout", {
        body: {
          items: lines.map((l) => ({ variant_id: l.variant_id, qty: l.qty })),
          email: form.email,
          user_id: userId,
          shipping_method: method,
          discount_code: promo || null,
          shipping_address: form,
          return_url: `${window.location.origin}/clothes/order-return`,
          cancel_url: `${window.location.origin}/clothes/cart`,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Checkout failed");
      window.location.href = data.approve_url;
    } catch (e) {
      toast({ title: "Checkout failed", description: (e as Error).message, variant: "destructive" });
      setSubmitting(false);
    }
  };

  if (!lines.length) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-3xl px-4 py-20">
          <p>Your bag is empty.</p>
          <button className="mt-4 underline" onClick={() => navigate("/clothes/shop")}>Shop the drop</button>
        </div>
      </StoreLayout>
    );
  }

  const field = (name: keyof typeof form, label: string, extra: Record<string, unknown> = {}) => (
    <label className="block">
      <span className="text-xs uppercase tracking-widest" style={{ color: "hsl(var(--store-muted))" }}>{label}</span>
      <input
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="mt-1 w-full border bg-transparent px-3 py-2 text-sm outline-none"
        style={{ borderColor: "hsl(var(--store-line))" }}
        {...extra}
      />
    </label>
  );

  return (
    <StoreLayout>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[1.2fr,1fr]">
        <div>
          <h1 className="store-display text-3xl uppercase tracking-widest">Checkout</h1>
          <div className="mt-8 space-y-4">
            {field("email", "Email", { type: "email" })}
            {field("full_name", "Full name")}
            {field("line1", "Address")}
            {field("line2", "Apt / suite (optional)")}
            <div className="grid grid-cols-3 gap-3">
              {field("city", "City")}
              {field("state", "State")}
              {field("zip", "ZIP")}
            </div>
          </div>

          <div className="mt-8">
            <p className="mb-3 text-xs uppercase tracking-widest">Shipping method</p>
            {(["standard", "express"] as const).map((m) => (
              <label key={m} className="mb-2 flex items-center gap-3 border p-3 text-sm" style={{ borderColor: method === m ? "hsl(var(--store-gold))" : "hsl(var(--store-line))" }}>
                <input type="radio" checked={method === m} onChange={() => setMethod(m)} />
                <span className="capitalize">{m}</span>
                <span className="ml-auto">
                  {m === "standard"
                    ? subtotal >= shipping.free_threshold_cents ? "Free" : money(shipping.standard_cents)
                    : money(shipping.express_cents)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <aside className="border p-5" style={{ borderColor: "hsl(var(--store-line))" }}>
          <h2 className="store-display text-lg uppercase tracking-widest">Order summary</h2>
          <div className="mt-4 space-y-3">
            {lines.map((l) => (
              <div key={l.variant_id} className="flex justify-between text-sm">
                <span>{l.name} × {l.qty}<br /><span style={{ color: "hsl(var(--store-muted))" }}>{l.size} · {l.color}</span></span>
                <span>{money(l.price_cents * l.qty)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <label className="text-xs uppercase tracking-widest" style={{ color: "hsl(var(--store-muted))" }}>Promo code</label>
            <input
              value={promo}
              onChange={(e) => setPromo(e.target.value.toUpperCase())}
              className="mt-1 w-full border bg-transparent px-3 py-2 text-sm outline-none"
              style={{ borderColor: "hsl(var(--store-line))" }}
              placeholder="DIMES10"
            />
            <p className="mt-1 text-[11px]" style={{ color: "hsl(var(--store-muted))" }}>
              Valid codes are applied to your total at payment.
            </p>
          </div>
          <div className="mt-5 space-y-2 border-t pt-4 text-sm" style={{ borderColor: "hsl(var(--store-line))" }}>
            <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{shippingCents === 0 ? "Free" : money(shippingCents)}</span></div>
            <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{money(total)}</span></div>
          </div>
          <button
            disabled={submitting}
            onClick={pay}
            className="mt-6 w-full py-4 text-xs font-semibold uppercase tracking-[0.25em] text-white disabled:opacity-60"
            style={{ backgroundColor: "hsl(var(--store-pink))" }}
          >
            {submitting ? "Redirecting…" : "Pay with PayPal"}
          </button>
        </aside>
      </div>
    </StoreLayout>
  );
};

export default StoreCheckout;
