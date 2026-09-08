import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useWishlist() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    if (!userId) { setIds([]); return; }
    const { data } = await supabase.from("store_wishlists").select("product_id").eq("user_id", userId);
    setIds((data || []).map((r: { product_id: string }) => r.product_id));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (productId: string) => {
    if (!userId) return false;
    if (ids.includes(productId)) {
      await supabase.from("store_wishlists").delete().eq("user_id", userId).eq("product_id", productId);
      setIds((prev) => prev.filter((i) => i !== productId));
    } else {
      await supabase.from("store_wishlists").insert({ user_id: userId, product_id: productId });
      setIds((prev) => [...prev, productId]);
    }
    return true;
  }, [ids, userId]);

  return { wishlistIds: ids, toggleWishlist: toggle, signedIn: !!userId, reload: load };
}
