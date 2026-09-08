
-- PRODUCTS
CREATE TABLE public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'unisex',
  price_cents integer NOT NULL DEFAULT 0,
  compare_at_cents integer,
  image_paths text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_products TO authenticated;
GRANT ALL ON public.store_products TO service_role;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published products" ON public.store_products FOR SELECT USING (published AND NOT archived);
CREATE POLICY "Admins manage products" ON public.store_products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- VARIANTS
CREATE TABLE public.store_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  size text NOT NULL DEFAULT 'OS',
  color text NOT NULL DEFAULT 'Black',
  sku text UNIQUE,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_variants TO authenticated;
GRANT ALL ON public.store_variants TO service_role;
ALTER TABLE public.store_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads variants of published products" ON public.store_variants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.store_products p WHERE p.id = product_id AND p.published AND NOT p.archived)
);
CREATE POLICY "Admins manage variants" ON public.store_variants FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- CART
CREATE TABLE public.store_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  variant_id uuid NOT NULL REFERENCES public.store_variants(id) ON DELETE CASCADE,
  qty integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, variant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_cart_items TO authenticated;
GRANT ALL ON public.store_cart_items TO service_role;
ALTER TABLE public.store_cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cart" ON public.store_cart_items FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- WISHLIST
CREATE TABLE public.store_wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_wishlists TO authenticated;
GRANT ALL ON public.store_wishlists TO service_role;
ALTER TABLE public.store_wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlist" ON public.store_wishlists FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ADDRESSES
CREATE TABLE public.store_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_addresses TO authenticated;
GRANT ALL ON public.store_addresses TO service_role;
ALTER TABLE public.store_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own addresses" ON public.store_addresses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ORDERS
CREATE TABLE public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  subtotal_cents integer NOT NULL DEFAULT 0,
  shipping_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  discount_code text,
  paypal_order_id text UNIQUE,
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  shipping_method text,
  tracking_number text,
  carrier text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_orders TO authenticated;
GRANT ALL ON public.store_orders TO service_role;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own orders" ON public.store_orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage orders" ON public.store_orders FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ORDER ITEMS
CREATE TABLE public.store_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id uuid,
  variant_id uuid,
  name text NOT NULL,
  size text,
  color text,
  image_path text,
  unit_price_cents integer NOT NULL DEFAULT 0,
  qty integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_order_items TO authenticated;
GRANT ALL ON public.store_order_items TO service_role;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own order items" ON public.store_order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);
CREATE POLICY "Admins manage order items" ON public.store_order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- DISCOUNTS
CREATE TABLE public.store_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type text NOT NULL DEFAULT 'percent',
  value numeric NOT NULL DEFAULT 0,
  min_subtotal_cents integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.store_discounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_discounts TO authenticated;
ALTER TABLE public.store_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage discounts" ON public.store_discounts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- INVENTORY EVENTS
CREATE TABLE public.store_inventory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.store_variants(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL DEFAULT 'count',
  admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.store_inventory_events TO authenticated;
GRANT ALL ON public.store_inventory_events TO service_role;
ALTER TABLE public.store_inventory_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage inventory events" ON public.store_inventory_events FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- AUDIT LOGS
CREATE TABLE public.store_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_audit_logs TO authenticated;
GRANT ALL ON public.store_audit_logs TO service_role;
ALTER TABLE public.store_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit logs" ON public.store_audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- SETTINGS
CREATE TABLE public.store_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.store_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- STOCK RPC
CREATE OR REPLACE FUNCTION public.decrement_stock(p_variant_id uuid, p_qty integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_new integer;
BEGIN
  UPDATE public.store_variants
     SET stock = stock - p_qty
   WHERE id = p_variant_id AND stock >= p_qty
  RETURNING stock INTO v_new;
  IF v_new IS NULL THEN
    RAISE EXCEPTION 'Insufficient stock for variant %', p_variant_id;
  END IF;
  RETURN v_new;
END;
$$;

CREATE TRIGGER store_products_updated_at BEFORE UPDATE ON public.store_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER store_orders_updated_at BEFORE UPDATE ON public.store_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
