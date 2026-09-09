ALTER TABLE public.rental_bookings
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS paypal_capture_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE OR REPLACE VIEW public.v_vehicle_rented_until
WITH (security_invoker = false) AS
SELECT b.vehicle_id,
       MAX(b.end_date) AS rented_until
FROM public.rental_bookings b
WHERE b.status = 'active'
  AND b.end_date IS NOT NULL
  AND b.end_date >= now()
GROUP BY b.vehicle_id;

GRANT SELECT ON public.v_vehicle_rented_until TO anon, authenticated;
GRANT SELECT ON public.v_vehicle_rented_until TO service_role;