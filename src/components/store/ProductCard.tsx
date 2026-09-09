import React from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { StoreProduct, money, productImage, useSignedStoreImage } from "@/lib/store";

type Props = {
  product: StoreProduct;
  wishlisted?: boolean;
  onToggleWishlist?: (productId: string) => void;
};

const ProductCard: React.FC<Props> = ({ product, wishlisted, onToggleWishlist }) => {
  const cardImage = useSignedStoreImage(productImage(product));
  const onSale = product.compare_at_cents && product.compare_at_cents > product.price_cents;
  return (
    <div className="group relative">
      <Link to={`/clothes/product/${product.slug}`} className="block overflow-hidden">
        <div className="relative aspect-[4/5] overflow-hidden" style={{ backgroundColor: "hsl(var(--store-surface))" }}>
          <img
            src={cardImage}
            alt={product.name}
            loading="lazy"
            width={768}
            height={960}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {onSale && (
            <span className="absolute left-3 top-3 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white" style={{ backgroundColor: "hsl(var(--store-pink))" }}>
              Sale
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-sm">{product.name}</p>
          <p className="mt-1 text-sm" style={{ color: "hsl(var(--store-muted))" }}>
            {money(product.price_cents)}
            {onSale && <span className="ml-2 line-through">{money(product.compare_at_cents!)}</span>}
          </p>
        </div>
      </Link>
      {onToggleWishlist && (
        <button
          aria-label="Toggle wishlist"
          onClick={() => onToggleWishlist(product.id)}
          className="absolute right-3 top-3 rounded-full bg-black/50 p-2"
        >
          <Heart className="h-4 w-4" style={{ color: wishlisted ? "hsl(var(--store-pink))" : "hsl(var(--store-fg))", fill: wishlisted ? "hsl(var(--store-pink))" : "transparent" }} />
        </button>
      )}
    </div>
  );
};

export default ProductCard;
