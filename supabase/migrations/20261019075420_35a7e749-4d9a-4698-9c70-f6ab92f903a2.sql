ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS extra_mile_fee numeric,
  ADD COLUMN IF NOT EXISTS unlimited_mileage_rate numeric;
ALTER TABLE public.rental_bookings
  ADD COLUMN IF NOT EXISTS mileage_plan text NOT NULL DEFAULT 'limited',
  ADD COLUMN IF NOT EXISTS mileage_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS protection_plan text NOT NULL DEFAULT 'own',
  ADD COLUMN IF NOT EXISTS protection_total numeric NOT NULL DEFAULT 0;