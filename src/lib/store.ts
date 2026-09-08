import { supabase } from "@/integrations/supabase/client";

export type StoreVariant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  stock: number;
  sku?: string | null;
};

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  compare_at_cents: number | null;
  image_paths: string[];
  tags: string[];
  featured: boolean;
  published?: boolean;
  archived?: boolean;
  store_variants?: StoreVariant[];
};

export type CartLine = {
  variant_id: string;
  product_id: string;
  slug: string;
  name: string;
  size: string;
  color: string;
  price_cents: number;
  image: string | null;
  qty: number;
};

export const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "women", label: "Women" },
  { key: "men", label: "Men" },
  { key: "drops", label: "Drops" },
  { key: "accessories", label: "Accessories" },
];

export const SIZE_GUIDE = [
  { size: "XS", chest: "31-32", waist: "24-25" },
  { size: "S", chest: "33-35", waist: "26-28" },
  { size: "M", chest: "36-38", waist: "29-31" },
  { size: "L", chest: "39-41", waist: "32-34" },
  { size: "XL", chest: "42-44", waist: "35-37" },
];

export const productImage = (p: Pick<StoreProduct, "image_paths">) =>
  p.image_paths?.[0] || "/store/placeholder.jpg";

export async function fetchProducts(): Promise<StoreProduct[]> {
  const { data, error } = await supabase
    .from("store_products")
    .select("*, store_variants(*)")
    .eq("published", true)
    .eq("archived", false)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as StoreProduct[];
}

export async function fetchProductBySlug(slug: string): Promise<StoreProduct | null> {
  const { data, error } = await supabase
    .from("store_products")
    .select("*, store_variants(*)")
    .eq("slug", slug)
    .eq("published", true)
    .eq("archived", false)
    .maybeSingle();
  if (error) throw error;
  return (data as StoreProduct) || null;
}

export async function fetchStoreSettings() {
  const { data } = await supabase.from("store_settings").select("key,value");
  const out: Record<string, any> = {};
  for (const row of data || []) out[row.key] = row.value;
  return out;
}

export const defaultShipping = {
  standard_cents: 799,
  express_cents: 1499,
  free_threshold_cents: 15000,
};
