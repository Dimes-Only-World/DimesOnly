CREATE OR REPLACE VIEW public.v_vehicle_rented_until
WITH (security_invoker = false) AS
SELECT b.vehicle_id,
       MAX(b.end_date) AS rented_until
FROM public.rental_bookings b
WHERE b.status IN ('approved','paid','active')
  AND b.end_date IS NOT NULL
  AND b.end_date >= now()
GROUP BY b.vehicle_id;

GRANT SELECT ON public.v_vehicle_rented_until TO anon, authenticated;
GRANT SELECT ON public.v_vehicle_rented_until TO service_role;