import React from "react";
import { Link, useNavigate } from "react-router-dom";
import StoreLayout from "@/components/store/StoreLayout";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { money } from "@/lib/store";

const StoreCart: React.FC = () => {
  const { lines, subtotal, setQty, remove } = useStoreCart();
  const navigate = useNavigate();

  return (
    <StoreLayout>
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="store-display text-3xl uppercase tracking-widest">Your Bag</h1>
        {lines.length === 0 ? (
          <div className="mt-8">
            <p style={{ color: "hsl(var(--store-muted))" }}>Your bag is empty.</p>
            <Link to="/clothes/shop" className="mt-4 inline-block underline">Shop the drop</Link>
          </div>
        ) : (
          <>
            <div className="mt-8 space-y-6">
              {lines.map((l) => (
                <div key={l.variant_id} className="flex gap-4 border-b pb-6" style={{ borderColor: "hsl(var(--store-line))" }}>
                  {l.image && <img src={l.image} alt={l.name} loading="lazy" className="h-32 w-24 object-cover" />}
                  <div className="flex-1">
                    <Link to={`/clothes/product/${l.slug}`} className="font-medium">{l.name}</Link>
                    <p className="text-sm" style={{ color: "hsl(var(--store-muted))" }}>{l.size} · {l.color}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <button className="h-8 w-8 border" style={{ borderColor: "hsl(var(--store-line))" }} onClick={() => setQty(l.variant_id, l.qty - 1)}>-</button>
                      <span>{l.qty}</span>
                      <button className="h-8 w-8 border" style={{ borderColor: "hsl(var(--store-line))" }} onClick={() => setQty(l.variant_id, l.qty + 1)}>+</button>
                      <button className="ml-4 text-xs underline" onClick={() => remove(l.variant_id)}>Remove</button>
                    </div>
                  </div>
                  <div>{money(l.price_cents * l.qty)}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex items-center justify-between">
              <span className="text-sm uppercase tracking-widest">Subtotal</span>
              <span className="text-xl">{money(subtotal)}</span>
            </div>
            <button
              onClick={() => navigate("/clothes/checkout")}
              className="mt-6 w-full py-4 text-xs font-semibold uppercase tracking-[0.25em] text-white"
              style={{ backgroundColor: "hsl(var(--store-pink))" }}
            >
              Checkout
            </button>
          </>
        )}
      </div>
    </StoreLayout>
  );
};

export default StoreCart;
