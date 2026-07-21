
CREATE TABLE IF NOT EXISTS public.vehicle_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.rental_bookings(id) ON DELETE CASCADE,
  renter_user_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

GRANT SELECT ON public.vehicle_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_reviews TO authenticated;
GRANT ALL ON public.vehicle_reviews TO service_role;

ALTER TABLE public.vehicle_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON public.vehicle_reviews FOR SELECT
  USING (true);

CREATE POLICY "Renters insert own reviews"
  ON public.vehicle_reviews FOR INSERT
  WITH CHECK (auth.uid() = renter_user_id OR public.is_admin());

CREATE POLICY "Renters update own reviews"
  ON public.vehicle_reviews FOR UPDATE
  USING (auth.uid() = renter_user_id OR public.is_admin())
  WITH CHECK (auth.uid() = renter_user_id OR public.is_admin());

CREATE POLICY "Renters delete own reviews or admin"
  ON public.vehicle_reviews FOR DELETE
  USING (auth.uid() = renter_user_id OR public.is_admin());

CREATE TRIGGER vehicle_reviews_updated_at
  BEFORE UPDATE ON public.vehicle_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_vehicle_reviews_vehicle ON public.vehicle_reviews(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_reviews_renter ON public.vehicle_reviews(renter_user_id);
