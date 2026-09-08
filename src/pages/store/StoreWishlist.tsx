import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StoreLayout from "@/components/store/StoreLayout";
import ProductCard from "@/components/store/ProductCard";
import { StoreProduct, fetchProducts } from "@/lib/store";
import { useWishlist } from "@/hooks/useWishlist";

const StoreWishlist: React.FC = () => {
  const { wishlistIds, toggleWishlist, signedIn } = useWishlist();
  const [products, setProducts] = useState<StoreProduct[]>([]);

  useEffect(() => {
    document.title = "Wishlist | Dimes Only Clothing";
    fetchProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  const saved = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-12">
        <h1 className="store-display text-3xl uppercase tracking-widest">Wishlist</h1>
        {!signedIn ? (
          <p className="mt-6 text-sm" style={{ color: "hsl(var(--store-muted))" }}>
            <Link to="/login" className="underline">Sign in</Link> to save pieces to your wishlist.
          </p>
        ) : saved.length === 0 ? (
          <p className="mt-6 text-sm" style={{ color: "hsl(var(--store-muted))" }}>Nothing saved yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {saved.map((p) => (
              <ProductCard key={p.id} product={p} wishlisted onToggleWishlist={toggleWishlist} />
            ))}
          </div>
        )}
      </div>
    </StoreLayout>
  );
};

export default StoreWishlist;
