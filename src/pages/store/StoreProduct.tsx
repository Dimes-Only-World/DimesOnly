import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import StoreLayout from "@/components/store/StoreLayout";
import ProductCard from "@/components/store/ProductCard";
import { StoreProduct as Product, SIZE_GUIDE, fetchProductBySlug, fetchProducts, money, productImage } from "@/lib/store";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { useWishlist } from "@/hooks/useWishlist";
import { useToast } from "@/hooks/use-toast";

const StoreProductPage: React.FC = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const { add } = useStoreCart();
  const { wishlistIds, toggleWishlist, signedIn } = useWishlist();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    fetchProductBySlug(slug!)
      .then(async (p) => {
        setProduct(p);
        if (p) {
          document.title = `${p.name} | Dimes Only Clothing`;
          setColor(p.store_variants?.[0]?.color || "");
          const all = await fetchProducts();
          setRelated(all.filter((x) => x.id !== p.id && x.category === p.category).slice(0, 4));
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const colors = useMemo(
    () => [...new Set((product?.store_variants || []).map((v) => v.color))],
    [product],
  );
  const sizes = useMemo(
    () => (product?.store_variants || []).filter((v) => v.color === color),
    [product, color],
  );
  const selected = sizes.find((v) => v.size === size);

  if (loading) {
    return <StoreLayout><div className="mx-auto max-w-7xl px-4 py-20">Loading…</div></StoreLayout>;
  }
  if (!product) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-7xl px-4 py-20">
          <p>This piece is no longer available.</p>
          <Link to="/clothes/shop" className="mt-4 inline-block underline">Back to shop</Link>
        </div>
      </StoreLayout>
    );
  }

  const images = product.image_paths?.length ? product.image_paths : [productImage(product)];
  const onSale = product.compare_at_cents && product.compare_at_cents > product.price_cents;

  const addToBag = () => {
    if (!selected) {
      toast({ title: "Pick a size first", variant: "destructive" });
      return;
    }
    if (selected.stock <= 0) {
      toast({ title: "That size is sold out", variant: "destructive" });
      return;
    }
    add({
      variant_id: selected.id,
      product_id: product.id,
      slug: product.slug,
      name: product.name,
      size: selected.size,
      color: selected.color,
      price_cents: product.price_cents,
      image: images[0],
      qty: 1,
    });
  };

  return (
    <StoreLayout>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-2">
        <div>
          <div className="aspect-[4/5] overflow-hidden" style={{ backgroundColor: "hsl(var(--store-surface))" }}>
            <img src={images[activeImage]} alt={product.name} width={768} height={960} className="h-full w-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {images.map((img, i) => (
                <button key={img} onClick={() => setActiveImage(i)} className="h-20 w-16 overflow-hidden border" style={{ borderColor: i === activeImage ? "hsl(var(--store-gold))" : "hsl(var(--store-line))" }}>
                  <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="store-display text-3xl uppercase tracking-wider">{product.name}</h1>
          <p className="mt-3 text-xl">
            {money(product.price_cents)}
            {onSale && <span className="ml-3 text-base line-through" style={{ color: "hsl(var(--store-muted))" }}>{money(product.compare_at_cents!)}</span>}
          </p>
          <p className="mt-5 text-sm leading-relaxed" style={{ color: "hsl(var(--store-muted))" }}>{product.description}</p>

          <div className="mt-8">
            <p className="mb-2 text-xs uppercase tracking-widest">Color</p>
            <div className="flex gap-3">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setSize(""); }}
                  className="border px-4 py-2 text-xs uppercase tracking-widest"
                  style={{ borderColor: c === color ? "hsl(var(--store-gold))" : "hsl(var(--store-line))" }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest">Size</p>
              <button className="text-xs underline" onClick={() => setShowGuide((v) => !v)}>Size guide</button>
            </div>
            <div className="flex flex-wrap gap-3">
              {sizes.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSize(v.size)}
                  disabled={v.stock <= 0}
                  className="border px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-30"
                  style={{ borderColor: v.size === size ? "hsl(var(--store-gold))" : "hsl(var(--store-line))" }}
                >
                  {v.size}
                </button>
              ))}
            </div>
            {selected && (
              <p className="mt-3 text-xs" style={{ color: "hsl(var(--store-muted))" }}>
                {selected.stock > 0 ? `${selected.stock} in stock` : "Sold out"}
              </p>
            )}
          </div>

          {showGuide && (
            <table className="mt-6 w-full border text-xs" style={{ borderColor: "hsl(var(--store-line))" }}>
              <thead><tr><th className="p-2 text-left">Size</th><th className="p-2 text-left">Chest (in)</th><th className="p-2 text-left">Waist (in)</th></tr></thead>
              <tbody>
                {SIZE_GUIDE.map((r) => (
                  <tr key={r.size} className="border-t" style={{ borderColor: "hsl(var(--store-line))" }}>
                    <td className="p-2">{r.size}</td><td className="p-2">{r.chest}</td><td className="p-2">{r.waist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-8 flex gap-3">
            <button
              onClick={addToBag}
              className="flex-1 py-4 text-xs font-semibold uppercase tracking-[0.25em] text-white"
              style={{ backgroundColor: "hsl(var(--store-pink))" }}
            >
              Add to bag
            </button>
            {signedIn && (
              <button
                onClick={() => toggleWishlist(product.id)}
                className="border px-5 text-xs uppercase tracking-widest"
                style={{ borderColor: "hsl(var(--store-line))" }}
              >
                {wishlistIds.includes(product.id) ? "Saved" : "Save"}
              </button>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 pb-20">
          <h2 className="store-display mb-6 text-2xl uppercase tracking-widest">You may also like</h2>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </StoreLayout>
  );
};

export default StoreProductPage;
