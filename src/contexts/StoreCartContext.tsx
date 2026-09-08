import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CartLine } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

const KEY = "dimes-clothing-cart";

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: CartLine) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const read = (): CartLine[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
};

export const StoreCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lines, setLines] = useState<CartLine[]>(read);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines]);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Best-effort sync of the signed-in shopper's cart to their account
  useEffect(() => {
    if (!userId) return;
    const sync = async () => {
      try {
        await supabase.from("store_cart_items").delete().eq("user_id", userId);
        if (lines.length) {
          await supabase.from("store_cart_items").insert(
            lines.map((l) => ({ user_id: userId, variant_id: l.variant_id, qty: l.qty })),
          );
        }
      } catch {
        /* cart still lives in the browser */
      }
    };
    const t = setTimeout(sync, 800);
    return () => clearTimeout(t);
  }, [userId, lines]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.variant_id === line.variant_id);
      if (existing) {
        return prev.map((l) =>
          l.variant_id === line.variant_id ? { ...l, qty: Math.min(20, l.qty + line.qty) } : l,
        );
      }
      return [...prev, line];
    });
    setDrawerOpen(true);
  }, []);

  const setQty = useCallback((variantId: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.variant_id !== variantId)
        : prev.map((l) => (l.variant_id === variantId ? { ...l, qty: Math.min(20, qty) } : l)),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setLines((prev) => prev.filter((l) => l.variant_id !== variantId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => ({
    lines,
    count: lines.reduce((a, l) => a + l.qty, 0),
    subtotal: lines.reduce((a, l) => a + l.qty * l.price_cents, 0),
    add,
    setQty,
    remove,
    clear,
    drawerOpen,
    setDrawerOpen,
  }), [lines, add, setQty, remove, clear, drawerOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useStoreCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useStoreCart must be used inside StoreCartProvider");
  return ctx;
};
