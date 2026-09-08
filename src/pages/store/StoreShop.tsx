import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import StoreLayout from "@/components/store/StoreLayout";
import ProductCard from "@/components/store/ProductCard";
import { StoreProduct, fetchProducts } from "@/lib/store";
import { useWishlist } from "@/hooks/useWishlist";

const SIZES = ["XS", "S", "M", "L", "XL", "OS"];

const StoreShop: React.FC = () => {
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const q = (searchParams.get("q") || "").toLowerCase();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [sort, setSort] = useState("newest");
  const { wishlistIds, toggleWishlist, signedIn } = useWishlist();

  useEffect(() => {
    document.title = "Shop | Dimes Only Clothing";
    fetchProducts().then(setProducts).catch(() => setProducts([])).finally(() => setLoading(false));
  }, []);

  const colors = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.store_variants?.forEach((v) => set.add(v.color)));
    return [...set];
  }, [products]);

  const visible = useMemo(() => {
    let list = products;
    if (category && category !== "all") {
      list = category === "drops"
        ? list.filter((p) => p.tags?.includes("drops"))
        : list.filter((p) => p.category === category);
    }
    if (q) list = list.filter((p) => `${p.name} ${p.description} ${p.tags?.join(" ")}`.toLowerCase().includes(q));
    if (size) list = list.filter((p) => p.store_variants?.some((v) => v.size === size && v.stock > 0));
    if (color) list = list.filter((p) => p.store_variants?.some((v) => v.color === color && v.stock > 0));
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.price_cents - b.price_cents);
    if (sort === "price-desc") sorted.sort((a, b) => b.price_cents - a.price_cents);
    return sorted;
  }, [products, category, q, size, color, sort]);

  const title = q ? `Results for "${q}"` : category ? category : "Shop All";

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="store-display text-3xl uppercase tracking-widest">{title}</h1>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest">
          <select value={size} onChange={(e) => setSize(e.target.value)} className="border bg-transparent px-3 py-2" style={{ borderColor: "hsl(var(--store-line))" }}>
            <option value="">All sizes</option>
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={color} onChange={(e) => setColor(e.target.value)} className="border bg-transparent px-3 py-2" style={{ borderColor: "hsl(var(--store-line))" }}>
            <option value="">All colors</option>
            {colors.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="border bg-transparent px-3 py-2" style={{ borderColor: "hsl(var(--store-line))" }}>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
          {(size || color) && (
            <button className="underline" onClick={() => { setSize(""); setColor(""); }}>Clear</button>
          )}
        </div>

        {loading ? (
          <p className="mt-10" style={{ color: "hsl(var(--store-muted))" }}>Loading…</p>
        ) : visible.length === 0 ? (
          <p className="mt-10" style={{ color: "hsl(var(--store-muted))" }}>Nothing matches those filters yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {visible.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                wishlisted={wishlistIds.includes(p.id)}
                onToggleWishlist={signedIn ? toggleWishlist : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </StoreLayout>
  );
};

export default StoreShop;
