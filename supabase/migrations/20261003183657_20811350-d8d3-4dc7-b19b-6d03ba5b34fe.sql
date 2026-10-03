ALTER TABLE public.rental_bookings ADD COLUMN IF NOT EXISTS returned_at timestamptz;
ALTER TABLE public.rental_extensions
  ADD COLUMN IF NOT EXISTS late_fee numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_fee_waived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_applied numeric(10,2) NOT NULL DEFAULT 0;