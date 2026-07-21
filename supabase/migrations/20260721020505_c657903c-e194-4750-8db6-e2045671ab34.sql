
-- Themed packages
CREATE TABLE public.themed_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text,
  image_url text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  vehicle_ids uuid[] NOT NULL DEFAULT '{}',
  applies_to_all boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.themed_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.themed_packages TO authenticated;
GRANT ALL ON public.themed_packages TO service_role;
ALTER TABLE public.themed_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Themed packages readable by all" ON public.themed_packages FOR SELECT USING (true);
CREATE POLICY "Admins manage themed packages" ON public.themed_packages FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER themed_packages_set_updated_at BEFORE UPDATE ON public.themed_packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Booking add-ons
CREATE TABLE public.booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.rental_bookings(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.themed_packages(id) ON DELETE RESTRICT,
  price_snapshot numeric(10,2) NOT NULL DEFAULT 0,
  name_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_addons TO authenticated;
GRANT ALL ON public.booking_addons TO service_role;
ALTER TABLE public.booking_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own booking addons" ON public.booking_addons FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.rental_bookings b WHERE b.id = booking_id AND b.renter_user_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "Users add addons to own bookings" ON public.booking_addons FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.rental_bookings b WHERE b.id = booking_id AND b.renter_user_id = auth.uid())
);
CREATE POLICY "Admins manage addons" ON public.booking_addons FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX booking_addons_booking_idx ON public.booking_addons(booking_id);

-- Contests
CREATE TABLE public.capture_contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  prize text,
  rules text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  winner_capture_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.capture_contests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capture_contests TO authenticated;
GRANT ALL ON public.capture_contests TO service_role;
ALTER TABLE public.capture_contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contests readable by all" ON public.capture_contests FOR SELECT USING (true);
CREATE POLICY "Admins manage contests" ON public.capture_contests FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER capture_contests_set_updated_at BEFORE UPDATE ON public.capture_contests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Rental captures
CREATE TABLE public.rental_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.rental_bookings(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('photo','video')),
  storage_path text NOT NULL,
  caption text,
  is_featured boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected')),
  contest_id uuid REFERENCES public.capture_contests(id) ON DELETE SET NULL,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rental_captures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_captures TO authenticated;
GRANT ALL ON public.rental_captures TO service_role;
ALTER TABLE public.rental_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved captures public" ON public.rental_captures FOR SELECT USING (
  moderation_status = 'approved' OR user_id = auth.uid() OR public.is_admin()
);
CREATE POLICY "Users upload own captures" ON public.rental_captures FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own captures" ON public.rental_captures FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users delete own captures" ON public.rental_captures FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

CREATE INDEX rental_captures_booking_idx ON public.rental_captures(booking_id);
CREATE INDEX rental_captures_vehicle_idx ON public.rental_captures(vehicle_id);
CREATE INDEX rental_captures_featured_idx ON public.rental_captures(is_featured) WHERE is_featured = true;
CREATE INDEX rental_captures_contest_idx ON public.rental_captures(contest_id);

CREATE TRIGGER rental_captures_set_updated_at BEFORE UPDATE ON public.rental_captures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.capture_contests ADD CONSTRAINT capture_contests_winner_fk FOREIGN KEY (winner_capture_id) REFERENCES public.rental_captures(id) ON DELETE SET NULL;

-- Storage RLS for rental-captures bucket
CREATE POLICY "Users upload captures to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rental-captures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read captures from own folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rental-captures' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

CREATE POLICY "Users delete own captures storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'rental-captures' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

CREATE POLICY "Public read approved captures"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'rental-captures' AND EXISTS (
    SELECT 1 FROM public.rental_captures c
    WHERE c.storage_path = storage.objects.name AND c.moderation_status = 'approved'
  ));
