// Shared clothing-store order fulfillment and pricing (PayPal + Cash App).
// deno-lint-ignore-file no-explicit-any

const DIRECT_RATE = 0.10;
const UPLINE_RATE = 0.05;

export interface StorePricingInput {
  items: Array<{ variant_id: string; qty: number }>;
  shipping_method?: string;
  discount_code?: string | null;
}

/** Server-side pricing. Returns either an error string or the totals + order items. */
export async function priceStoreOrder(supabase: any, input: StorePricingInput) {
  const items = input.items || [];
  if (!items.length) return { error: "Cart is empty" } as const;
  const shippingMethod = input.shipping_method === "express" ? "express" : "standard";
  const discountCode = input.discount_code ? String(input.discount_code).trim().toUpperCase() : null;

  const { data: variants, error: vErr } = await supabase
    .from("store_variants")
    .select("id, size, color, stock, product_id, store_products(id,name,price_cents,image_paths,published,archived)")
    .in("id", items.map((i) => i.variant_id));
  if (vErr) throw vErr;

  let subtotal = 0;
  const orderItems: Record<string, unknown>[] = [];
  for (const item of items) {
    const qty = Math.max(1, Math.min(20, Number(item.qty) || 1));
    const v = (variants || []).find((x: any) => x.id === item.variant_id) as any;
    if (!v) return { error: "Item no longer available" } as const;
    const p = v.store_products;
    if (!p || !p.published || p.archived) return { error: `${p?.name || "Item"} is unavailable` } as const;
    if (v.stock < qty) return { error: `${p.name} (${v.size}/${v.color}) is out of stock` } as const;
    subtotal += p.price_cents * qty;
    orderItems.push({
      product_id: p.id, variant_id: v.id, name: p.name, size: v.size, color: v.color,
      image_path: (p.image_paths || [])[0] || null, unit_price_cents: p.price_cents, qty,
    });
  }

  const { data: shipSetting } = await supabase.from("store_settings").select("value").eq("key", "shipping").maybeSingle();
  const ship = (shipSetting?.value as any) || { standard_cents: 799, express_cents: 1499, free_threshold_cents: 15000 };
  let shippingCents = shippingMethod === "express" ? ship.express_cents : ship.standard_cents;
  if (shippingMethod === "standard" && subtotal >= ship.free_threshold_cents) shippingCents = 0;

  let discountCents = 0;
  let appliedCode: string | null = null;
  if (discountCode) {
    const { data: d } = await supabase.from("store_discounts").select("*").eq("code", discountCode).maybeSingle();
    const now = new Date();
    const valid = d && d.active && subtotal >= (d.min_subtotal_cents || 0) &&
      (!d.starts_at || new Date(d.starts_at) <= now) && (!d.ends_at || new Date(d.ends_at) >= now) &&
      (!d.max_uses || d.uses < d.max_uses);
    if (!valid) return { error: "Promo code is not valid for this order" } as const;
    discountCents = d.type === "percent" ? Math.round(subtotal * (Number(d.value) / 100)) : Math.round(Number(d.value) * 100);
    discountCents = Math.min(discountCents, subtotal);
    appliedCode = d.code;
  }

  const totalCents = Math.max(0, subtotal - discountCents) + shippingCents;
  return { subtotal, shippingCents, discountCents, totalCents, appliedCode, shippingMethod, orderItems } as const;
}

/** Marks a pending order paid, decrements stock, counts discount, clears cart, records commissions. */
export async function fulfillStoreOrder(supabase: any, order: any) {
  const { data: paidRows, error: uErr } = await supabase
    .from("store_orders").update({ status: "paid" }).eq("id", order.id).eq("status", "pending").select("id");
  if (uErr) throw uErr;
  if (!paidRows || paidRows.length === 0) return { already_processed: true };

  const { data: items } = await supabase.from("store_order_items").select("variant_id, qty").eq("order_id", order.id);
  for (const it of items || []) {
    if (!it.variant_id) continue;
    const { error } = await supabase.rpc("decrement_stock", { p_variant_id: it.variant_id, p_qty: it.qty });
    if (error) console.error("stock decrement failed", it.variant_id, error.message);
  }

  if (order.discount_code) {
    const { data: d } = await supabase.from("store_discounts").select("id,uses").eq("code", order.discount_code).maybeSingle();
    if (d) await supabase.from("store_discounts").update({ uses: (d.uses || 0) + 1 }).eq("id", d.id);
  }

  if (order.user_id) await supabase.from("store_cart_items").delete().eq("user_id", order.user_id);

  const commissionBase = Math.max(0, order.subtotal_cents - order.discount_cents) / 100;
  const payouts: Record<string, unknown>[] = [];
  if (order.user_id && commissionBase > 0) {
    const { data: buyer } = await supabase.from("users").select("id, referred_by").eq("id", order.user_id).maybeSingle();
    const directName = (buyer?.referred_by || "").trim();
    if (directName) {
      const { data: direct } = await supabase.from("users").select("id, referred_by").ilike("username", directName).maybeSingle();
      if (direct?.id) {
        payouts.push({ user_id: direct.id, commission_type: "clothing_commission", amount: Number((commissionBase * DIRECT_RATE).toFixed(2)), payout_status: "pending" });
        const uplineName = (direct.referred_by || "").trim();
        if (uplineName) {
          const { data: upline } = await supabase.from("users").select("id").ilike("username", uplineName).maybeSingle();
          if (upline?.id) payouts.push({ user_id: upline.id, commission_type: "clothing_upline", amount: Number((commissionBase * UPLINE_RATE).toFixed(2)), payout_status: "pending" });
        }
      }
    }
  }
  if (payouts.length) {
    const { error: cErr } = await supabase.from("commission_payouts").insert(payouts);
    if (cErr) console.error("commission insert failed", cErr.message);
  }
  return { already_processed: false };
}
