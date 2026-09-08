import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { action, adminUserId, ...params } = await req.json();
    if (!adminUserId) return json({ error: "Admin user ID required" }, 401);

    const { data: isAdmin, error: roleError } = await supabase
      .rpc("check_admin_by_user_id", { _user_id: adminUserId });
    if (roleError || !isAdmin) return json({ error: "Admin access required" }, 403);

    const audit = async (action_name: string, entity: string, entity_id?: string, meta: unknown = {}) => {
      await supabase.from("store_audit_logs").insert({
        actor_id: adminUserId, action: action_name, entity, entity_id: entity_id ?? null, meta,
      });
    };

    switch (action) {
      case "overview": {
        const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
        const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
        const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
        const { data: orders } = await supabase
          .from("store_orders").select("id,total_cents,status,created_at,email")
          .neq("status", "pending").gte("created_at", since30).order("created_at", { ascending: false });
        const list = orders || [];
        const sum = (rows: any[]) => rows.reduce((a, r) => a + (r.total_cents || 0), 0);
        const { data: lowStock } = await supabase
          .from("store_variants").select("id,size,color,stock,store_products(name)").lte("stock", 3).limit(50);
        return json({
          today_cents: sum(list.filter((o) => new Date(o.created_at) >= startToday)),
          today_orders: list.filter((o) => new Date(o.created_at) >= startToday).length,
          week_cents: sum(list.filter((o) => o.created_at >= since7)),
          month_cents: sum(list),
          month_orders: list.length,
          recent: list.slice(0, 10),
          low_stock: lowStock || [],
        });
      }
      case "listProducts": {
        const { data, error } = await supabase
          .from("store_products").select("*, store_variants(*)").order("created_at", { ascending: false });
        if (error) throw error;
        return json({ products: data });
      }
      case "saveProduct": {
        const p = params.product;
        let productId = p.id;
        if (productId) {
          const { error } = await supabase.from("store_products").update({
            name: p.name, slug: p.slug, description: p.description, category: p.category,
            price_cents: p.price_cents, compare_at_cents: p.compare_at_cents,
            image_paths: p.image_paths, tags: p.tags, featured: p.featured,
            published: p.published, archived: p.archived,
          }).eq("id", productId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.from("store_products").insert({
            name: p.name, slug: p.slug, description: p.description, category: p.category,
            price_cents: p.price_cents, compare_at_cents: p.compare_at_cents,
            image_paths: p.image_paths || [], tags: p.tags || [], featured: !!p.featured,
            published: p.published !== false,
          }).select("id").single();
          if (error) throw error;
          productId = data.id;
        }
        await audit(p.id ? "update" : "create", "product", productId, { name: p.name });
        return json({ product_id: productId });
      }
      case "archiveProduct": {
        const { error } = await supabase.from("store_products")
          .update({ archived: params.archived !== false }).eq("id", params.product_id);
        if (error) throw error;
        await audit("archive", "product", params.product_id, { archived: params.archived !== false });
        return json({ ok: true });
      }
      case "saveVariant": {
        const v = params.variant;
        if (v.id) {
          const { error } = await supabase.from("store_variants")
            .update({ size: v.size, color: v.color, sku: v.sku, stock: v.stock, image_path: v.image_path ?? null }).eq("id", v.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("store_variants").insert({
            product_id: v.product_id, size: v.size, color: v.color, sku: v.sku || null, stock: v.stock || 0, image_path: v.image_path || null,
          });
          if (error) throw error;
        }
        await audit("save", "variant", v.id, v);
        return json({ ok: true });
      }
      case "setVariantImage": {
        const { error } = await supabase.from("store_variants")
          .update({ image_path: params.image_path || null })
          .eq("id", params.variant_id);
        if (error) throw error;
        await audit("set_image", "variant", params.variant_id, { image_path: params.image_path });
        return json({ ok: true });
      }
      case "setColorImage": {
        const { error } = await supabase.from("store_variants")
          .update({ image_path: params.image_path || null })
          .eq("product_id", params.product_id)
          .eq("color", params.color);
        if (error) throw error;
        await audit("set_image", "color", params.product_id, { color: params.color, image_path: params.image_path });
        return json({ ok: true });
      }
      case "deleteVariant": {
        const { error } = await supabase.from("store_variants").delete().eq("id", params.variant_id);
        if (error) throw error;
        await audit("delete", "variant", params.variant_id);
        return json({ ok: true });
      }
      case "adjustStock": {
        const { data: v, error: vErr } = await supabase
          .from("store_variants").select("stock").eq("id", params.variant_id).single();
        if (vErr) throw vErr;
        const next = Math.max(0, (v.stock || 0) + Number(params.delta || 0));
        const { error } = await supabase.from("store_variants").update({ stock: next }).eq("id", params.variant_id);
        if (error) throw error;
        await supabase.from("store_inventory_events").insert({
          variant_id: params.variant_id, delta: Number(params.delta || 0),
          reason: params.reason || "manual", admin_id: adminUserId,
        });
        await audit("adjust_stock", "variant", params.variant_id, { delta: params.delta, reason: params.reason });
        return json({ stock: next });
      }
      case "listOrders": {
        let q = supabase.from("store_orders").select("*, store_order_items(*)")
          .order("created_at", { ascending: false }).limit(300);
        if (params.status && params.status !== "all") q = q.eq("status", params.status);
        const { data, error } = await q;
        if (error) throw error;
        return json({ orders: data });
      }
      case "updateOrder": {
        const patch: Record<string, unknown> = {};
        if (params.status) patch.status = params.status;
        if (params.tracking_number !== undefined) patch.tracking_number = params.tracking_number;
        if (params.carrier !== undefined) patch.carrier = params.carrier;
        const { error } = await supabase.from("store_orders").update(patch).eq("id", params.order_id);
        if (error) throw error;
        await audit("update", "order", params.order_id, patch);
        return json({ ok: true });
      }
      case "listCustomers": {
        const { data, error } = await supabase
          .from("store_orders").select("email,user_id,total_cents,status,created_at").neq("status", "pending");
        if (error) throw error;
        const map = new Map<string, { email: string; orders: number; total_cents: number; last: string }>();
        for (const o of data || []) {
          const cur = map.get(o.email) || { email: o.email, orders: 0, total_cents: 0, last: o.created_at };
          cur.orders += 1;
          cur.total_cents += o.total_cents || 0;
          if (o.created_at > cur.last) cur.last = o.created_at;
          map.set(o.email, cur);
        }
        return json({ customers: [...map.values()].sort((a, b) => b.total_cents - a.total_cents) });
      }
      case "listDiscounts": {
        const { data, error } = await supabase.from("store_discounts").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return json({ discounts: data });
      }
      case "saveDiscount": {
        const d = params.discount;
        const row = {
          code: String(d.code).trim().toUpperCase(), type: d.type, value: d.value,
          min_subtotal_cents: d.min_subtotal_cents || 0, starts_at: d.starts_at || null,
          ends_at: d.ends_at || null, max_uses: d.max_uses || null, active: d.active !== false,
        };
        const { error } = d.id
          ? await supabase.from("store_discounts").update(row).eq("id", d.id)
          : await supabase.from("store_discounts").insert(row);
        if (error) throw error;
        await audit("save", "discount", d.id, row);
        return json({ ok: true });
      }
      case "deleteDiscount": {
        const { error } = await supabase.from("store_discounts").delete().eq("id", params.discount_id);
        if (error) throw error;
        await audit("delete", "discount", params.discount_id);
        return json({ ok: true });
      }
      case "getSettings": {
        const { data, error } = await supabase.from("store_settings").select("*");
        if (error) throw error;
        return json({ settings: data });
      }
      case "saveSetting": {
        const { error } = await supabase.from("store_settings")
          .upsert({ key: params.key, value: params.value, updated_at: new Date().toISOString() });
        if (error) throw error;
        await audit("save", "setting", params.key, params.value);
        return json({ ok: true });
      }
      case "listAuditLogs": {
        const { data, error } = await supabase.from("store_audit_logs")
          .select("*").order("created_at", { ascending: false }).limit(200);
        if (error) throw error;
        return json({ logs: data });
      }
      case "signImages": {
        const paths: string[] = params.paths || [];
        const storagePaths = paths.filter((p) => !p.startsWith("/") && !p.startsWith("http"));
        const urls: Record<string, string> = {};
        if (storagePaths.length) {
          const { data } = await supabase.storage.from("product-images").createSignedUrls(storagePaths, 3600);
          for (const row of data || []) {
            if (row.path && row.signedUrl) urls[row.path] = row.signedUrl;
          }
        }
        return json({ urls });
      }
      case "uploadImage": {
        const base64: string = params.data;
        const path: string = params.path;
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const { error } = await supabase.storage.from("product-images")
          .upload(path, bytes, { contentType: params.content_type || "image/jpeg", upsert: true });
        if (error) throw error;
        await audit("upload", "image", path);
        return json({ path });
      }
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("store-admin error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
