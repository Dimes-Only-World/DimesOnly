import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StoreLayout from "@/components/store/StoreLayout";
import ProductCard from "@/components/store/ProductCard";
import { StoreProduct, fetchProducts, productImage, useSignedStoreImage } from "@/lib/store";
import { useWishlist } from "@/hooks/useWishlist";

const StoreHome: React.FC = () => {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { wishlistIds, toggleWishlist, signedIn } = useWishlist();

  useEffect(() => {
    document.title = "Dimes Only Clothing | Luxury Streetwear";
    fetchProducts()
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const featured = products.filter((p) => p.featured).slice(0, 4);
  const hero = featured[0] || products[0];
  const heroImage = useSignedStoreImage(hero ? productImage(hero) : null);

  return (
    <StoreLayout>
      <section className="relative flex min-h-[70vh] items-center overflow-hidden">
        {hero && (
          <img
            src={heroImage}
            alt="Dimes Only Clothing"
            width={768}
            height={960}
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, hsl(var(--store-bg)) 10%, transparent 90%)" }} />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-24">
          <p className="text-xs uppercase tracking-[0.4em]" style={{ color: "hsl(var(--store-gold))" }}>The Drop Is Live</p>
          <h1 className="store-display mt-4 text-4xl font-bold uppercase leading-tight sm:text-6xl">
            Dimes Only<br />Clothing
          </h1>
          <p className="mt-4 max-w-md text-sm" style={{ color: "hsl(var(--store-muted))" }}>
            Luxury streetwear for the ones who show up like they own the room.
          </p>
          <Link
            to="/clothes/shop"
            className="mt-8 inline-block px-8 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white"
            style={{ backgroundColor: "hsl(var(--store-pink))" }}
          >
            Shop the Drop
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: "/clothes/shop/women", label: "Women" },
            { to: "/clothes/shop/men", label: "Men" },
            { to: "/clothes/shop/drops", label: "Limited Drops" },
            { to: "/clothes/shop/accessories", label: "Accessories" },
          ].map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="flex h-28 items-center justify-center border text-xs uppercase tracking-[0.3em] transition hover:opacity-80"
              style={{ borderColor: "hsl(var(--store-gold) / 0.4)" }}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <h2 className="store-display mb-6 text-2xl uppercase tracking-widest">Featured</h2>
        {loading ? (
          <p style={{ color: "hsl(var(--store-muted))" }}>Loading…</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {(featured.length ? featured : products.slice(0, 4)).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                wishlisted={wishlistIds.includes(p.id)}
                onToggleWishlist={signedIn ? toggleWishlist : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <h2 className="store-display mb-6 text-2xl uppercase tracking-widest">New In</h2>
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {products.slice(0, 8).map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              wishlisted={wishlistIds.includes(p.id)}
              onToggleWishlist={signedIn ? toggleWishlist : undefined}
            />
          ))}
        </div>
      </section>
    </StoreLayout>
  );
};

export default StoreHome;
