import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Search, Heart, User, Menu, X, Home } from "lucide-react";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { money } from "@/lib/store";

const NAV = [
  { to: "/clothes/shop/women", label: "Women" },
  { to: "/clothes/shop/men", label: "Men" },
  { to: "/clothes/shop/drops", label: "Drops" },
  { to: "/clothes/shop/accessories", label: "Accessories" },
  { to: "/clothes/shop", label: "Shop All" },
];

const CartDrawer: React.FC = () => {
  const { lines, subtotal, setQty, remove, drawerOpen, setDrawerOpen } = useStoreCart();
  const navigate = useNavigate();
  if (!drawerOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        aria-label="Close cart"
        className="flex-1 bg-black/70"
        onClick={() => setDrawerOpen(false)}
      />
      <aside className="store-theme w-full max-w-md overflow-y-auto border-l p-5" style={{ borderColor: "hsl(var(--store-line))" }}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="store-display text-xl">Your Bag</h2>
          <button onClick={() => setDrawerOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {lines.length === 0 ? (
          <p className="text-sm" style={{ color: "hsl(var(--store-muted))" }}>Your bag is empty.</p>
        ) : (
          <div className="space-y-4">
            {lines.map((l) => (
              <div key={l.variant_id} className="flex gap-3 border-b pb-4" style={{ borderColor: "hsl(var(--store-line))" }}>
                {l.image && <img src={l.image} alt={l.name} loading="lazy" className="h-24 w-20 rounded object-cover" />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{l.name}</p>
                  <p className="text-xs" style={{ color: "hsl(var(--store-muted))" }}>{l.size} · {l.color}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button className="h-7 w-7 border" style={{ borderColor: "hsl(var(--store-line))" }} onClick={() => setQty(l.variant_id, l.qty - 1)}>-</button>
                    <span className="text-sm">{l.qty}</span>
                    <button className="h-7 w-7 border" style={{ borderColor: "hsl(var(--store-line))" }} onClick={() => setQty(l.variant_id, l.qty + 1)}>+</button>
                    <button className="ml-auto text-xs underline" onClick={() => remove(l.variant_id)}>Remove</button>
                  </div>
                </div>
                <div className="text-sm">{money(l.price_cents * l.qty)}</div>
              </div>
            ))}
            <div className="flex justify-between pt-2 text-sm">
              <span style={{ color: "hsl(var(--store-muted))" }}>Subtotal</span>
              <span className="font-semibold">{money(subtotal)}</span>
            </div>
            <button
              className="w-full py-3 text-sm font-semibold uppercase tracking-wider text-white"
              style={{ backgroundColor: "hsl(var(--store-pink))" }}
              onClick={() => { setDrawerOpen(false); navigate("/clothes/checkout"); }}
            >
              Checkout
            </button>
            <Link to="/clothes/cart" onClick={() => setDrawerOpen(false)} className="block text-center text-xs underline">
              View bag
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
};

const StoreLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { count, setDrawerOpen } = useStoreCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/clothes/shop?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="store-theme min-h-screen">
      <div className="py-2 text-center text-[11px] uppercase tracking-[0.25em]" style={{ backgroundColor: "hsl(var(--store-pink))", color: "#fff" }}>
        Free shipping on orders over $150
      </div>
      <header className="sticky top-0 z-50 border-b backdrop-blur" style={{ borderColor: "hsl(var(--store-line))", backgroundColor: "hsl(var(--store-bg) / 0.92)" }}>
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <button className="lg:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/clothes" className="store-display text-lg font-bold uppercase tracking-[0.3em]">
            Dimes<span style={{ color: "hsl(var(--store-gold))" }}>Only</span>
          </Link>
          <nav className="ml-6 hidden gap-6 text-xs uppercase tracking-widest lg:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="hover:opacity-70">{n.label}</Link>
            ))}
          </nav>
          <form onSubmit={submitSearch} className="ml-auto hidden items-center gap-2 border px-3 py-1.5 md:flex" style={{ borderColor: "hsl(var(--store-line))" }}>
            <Search className="h-4 w-4" style={{ color: "hsl(var(--store-muted))" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-36 bg-transparent text-sm outline-none"
            />
          </form>
          <div className="ml-auto flex items-center gap-4 md:ml-0">
            <Link to="/dashboard/profile" aria-label="Back to Dimes Only"><Home className="h-5 w-5" /></Link>
            <Link to="/clothes/wishlist" aria-label="Wishlist"><Heart className="h-5 w-5" /></Link>
            <Link to="/clothes/orders" aria-label="Orders"><User className="h-5 w-5" /></Link>
            <button onClick={() => setDrawerOpen(true)} className="relative" aria-label="Open bag">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] text-white" style={{ backgroundColor: "hsl(var(--store-pink))" }}>
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-3 border-t px-4 py-4 text-sm uppercase tracking-widest lg:hidden" style={{ borderColor: "hsl(var(--store-line))" }}>
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setMenuOpen(false)}>{n.label}</Link>
            ))}
          </nav>
        )}
      </header>

      <main>{children}</main>

      <footer className="mt-20 border-t px-4 py-12" style={{ borderColor: "hsl(var(--store-line))" }}>
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div>
            <p className="store-display text-lg uppercase tracking-[0.3em]">Dimes Only</p>
            <p className="mt-3 text-sm" style={{ color: "hsl(var(--store-muted))" }}>
              Official apparel of Dimes Only World.
            </p>
          </div>
          <div className="text-sm" style={{ color: "hsl(var(--store-muted))" }}>
            <p className="mb-2 uppercase tracking-widest" style={{ color: "hsl(var(--store-fg))" }}>Shop</p>
            {NAV.map((n) => <Link key={n.to} to={n.to} className="block hover:opacity-70">{n.label}</Link>)}
          </div>
          <div className="text-sm" style={{ color: "hsl(var(--store-muted))" }}>
            <p className="mb-2 uppercase tracking-widest" style={{ color: "hsl(var(--store-fg))" }}>Help</p>
            <Link to="/clothes/policies/shipping" className="block hover:opacity-70">Shipping</Link>
            <Link to="/clothes/policies/returns" className="block hover:opacity-70">Returns</Link>
            <Link to="/clothes/policies/privacy" className="block hover:opacity-70">Privacy</Link>
            <Link to="/clothes/policies/terms" className="block hover:opacity-70">Terms</Link>
            <Link to="/clothes/policies/contact" className="block hover:opacity-70">Contact</Link>
          </div>
          <div className="text-sm" style={{ color: "hsl(var(--store-muted))" }}>
            <p className="mb-2 uppercase tracking-widest" style={{ color: "hsl(var(--store-fg))" }}>Account</p>
            <Link to="/clothes/orders" className="block hover:opacity-70">My orders</Link>
            <Link to="/clothes/wishlist" className="block hover:opacity-70">Wishlist</Link>
            <Link to="/dashboard/profile" className="block hover:opacity-70">Dimes Only World</Link>
          </div>
        </div>
        <p className="mt-10 text-center text-xs" style={{ color: "hsl(var(--store-muted))" }}>
          © {new Date().getFullYear()} Dimes Only Clothing. All rights reserved. 18+.
        </p>
      </footer>

      <CartDrawer />
    </div>
  );
};

export default StoreLayout;
