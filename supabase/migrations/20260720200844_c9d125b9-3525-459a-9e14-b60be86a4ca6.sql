
-- Vehicles
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  vin TEXT,
  license_plate TEXT,
  mileage INTEGER,
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  vehicle_type TEXT,
  pickup_location TEXT,
  day_rate NUMERIC(10,2),
  weekly_rate NUMERIC(10,2),
  monthly_rate NUMERIC(10,2),
  down_payment NUMERIC(10,2),
  rental_options TEXT[] NOT NULL DEFAULT '{}',
  availability_status TEXT NOT NULL DEFAULT 'available',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active vehicles" ON public.vehicles
  FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins manage vehicles" ON public.vehicles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vehicle media
CREATE TABLE public.vehicle_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo','video')),
  url TEXT NOT NULL,
  storage_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicle_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_media TO authenticated;
GRANT ALL ON public.vehicle_media TO service_role;
ALTER TABLE public.vehicle_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view vehicle media" ON public.vehicle_media
  FOR SELECT USING (true);
CREATE POLICY "Admins manage vehicle media" ON public.vehicle_media
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Enforce 25 photos / 3 videos per vehicle
CREATE OR REPLACE FUNCTION public.enforce_vehicle_media_limits()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.vehicle_media
    WHERE vehicle_id = NEW.vehicle_id AND media_type = NEW.media_type;
  IF NEW.media_type = 'photo' AND cnt >= 25 THEN
    RAISE EXCEPTION 'Vehicle already has maximum 25 photos';
  END IF;
  IF NEW.media_type = 'video' AND cnt >= 3 THEN
    RAISE EXCEPTION 'Vehicle already has maximum 3 videos';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER vehicle_media_limits BEFORE INSERT ON public.vehicle_media
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vehicle_media_limits();

-- Rental bookings
CREATE TABLE public.rental_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  renter_user_id UUID NOT NULL,
  rental_type TEXT NOT NULL CHECK (rental_type IN ('daily','weekly','monthly','long_term','rent_to_own')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  pickup_location TEXT,
  total_price NUMERIC(10,2) NOT NULL,
  down_payment_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','paid','active','completed','cancelled')),
  signature_text TEXT,
  signed_at TIMESTAMPTZ,
  license_path TEXT,
  insurance_path TEXT,
  paypal_order_id TEXT,
  referrer_username TEXT,
  upline_referrer_username TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_bookings TO authenticated;
GRANT ALL ON public.rental_bookings TO service_role;
ALTER TABLE public.rental_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Renters view their own bookings" ON public.rental_bookings
  FOR SELECT USING (auth.uid() = renter_user_id OR public.is_admin());
CREATE POLICY "Renters create their own bookings" ON public.rental_bookings
  FOR INSERT WITH CHECK (auth.uid() = renter_user_id);
CREATE POLICY "Renters cancel their own pending bookings" ON public.rental_bookings
  FOR UPDATE USING (auth.uid() = renter_user_id OR public.is_admin())
  WITH CHECK (auth.uid() = renter_user_id OR public.is_admin());
CREATE POLICY "Admins delete bookings" ON public.rental_bookings
  FOR DELETE USING (public.is_admin());
CREATE TRIGGER rental_bookings_updated_at BEFORE UPDATE ON public.rental_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rental commissions
CREATE TABLE public.rental_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.rental_bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('direct','upline')),
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  payout_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rental_commissions TO authenticated;
GRANT ALL ON public.rental_commissions TO service_role;
ALTER TABLE public.rental_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own commissions" ON public.rental_commissions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admins manage commissions" ON public.rental_commissions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER rental_commissions_updated_at BEFORE UPDATE ON public.rental_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_vehicle_media_vehicle ON public.vehicle_media(vehicle_id);
CREATE INDEX idx_rental_bookings_renter ON public.rental_bookings(renter_user_id);
CREATE INDEX idx_rental_bookings_vehicle ON public.rental_bookings(vehicle_id);
CREATE INDEX idx_rental_bookings_status ON public.rental_bookings(status);
CREATE INDEX idx_rental_commissions_user ON public.rental_commissions(user_id);
CREATE INDEX idx_rental_commissions_booking ON public.rental_commissions(booking_id);
