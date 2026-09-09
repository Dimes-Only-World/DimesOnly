import { supabase } from "@/integrations/supabase/client";

export type StoreVariant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  stock: number;
  sku?: string | null;
  image_path?: string | null;
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

export async function signStorePaths(paths: string[]): Promise<Record<string, string>> {
  const need = [...new Set(paths.filter((p) => p && !p.startsWith("/") && !p.startsWith("http")))];
  if (!need.length) return {};
  const { data } = await supabase.functions.invoke("store-images", { body: { paths: need } });
  return (data?.urls as Record<string, string>) || {};
}

/* ---- batched signed image URLs for list/grid views ---- */
const signedCache = new Map<string, string>();
const signedListeners = new Set<() => void>();
let pendingPaths: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function needsSigning(path?: string | null) {
  return !!path && !path.startsWith("/") && !path.startsWith("http") && !path.startsWith("data:");
}

async function flushSigning() {
  flushTimer = null;
  const batch = [...new Set(pendingPaths)];
  pendingPaths = [];
  if (!batch.length) return;
  try {
    const urls = await signStorePaths(batch);
    for (const [k, v] of Object.entries(urls)) if (v) signedCache.set(k, v);
  } catch {
    /* leave unsigned; placeholder shown */
  }
  signedListeners.forEach((fn) => fn());
}

export function requestSignedStoreImage(path: string) {
  if (!needsSigning(path) || signedCache.has(path)) return;
  pendingPaths.push(path);
  if (!flushTimer) flushTimer = setTimeout(flushSigning, 30);
}

/** Returns a displayable URL for a storage path, signing it in a shared batch. */
export function useSignedStoreImage(path?: string | null): string {
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    if (!needsSigning(path)) return;
    if (signedCache.has(path as string)) return;
    signedListeners.add(force);
    requestSignedStoreImage(path as string);
    return () => {
      signedListeners.delete(force);
    };
  }, [path]);

  if (!path) return "/store/placeholder.jpg";
  if (!needsSigning(path)) return path;
  return signedCache.get(path) || "/store/placeholder.jpg";
}
