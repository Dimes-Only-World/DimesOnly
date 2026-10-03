ALTER TABLE public.rental_bookings
  ADD COLUMN IF NOT EXISTS pickup_mileage integer,
  ADD COLUMN IF NOT EXISTS latest_reported_mileage integer;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS registration_state text,
  ADD COLUMN IF NOT EXISTS plate_expiration date,
  ADD COLUMN IF NOT EXISTS body_style text,
  ADD COLUMN IF NOT EXISTS color text;

CREATE TABLE public.rental_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.rental_bookings(id) ON DELETE CASCADE,
  renter_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  previous_end_date timestamptz NOT NULL,
  new_end_date timestamptz NOT NULL,
  extra_days integer NOT NULL,
  reported_mileage integer NOT NULL,
  extension_price numeric(12,2) NOT NULL,
  transaction_fee numeric(12,2) NOT NULL,
  total_charged numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paypal_order_id text,
  paypal_capture_id text,
  statement_path text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rental_extensions_positive_days CHECK (extra_days >= 1),
  CONSTRAINT rental_extensions_nonnegative_amounts CHECK (extension_price >= 0 AND transaction_fee >= 0 AND total_charged >= 0),
  CONSTRAINT rental_extensions_valid_mileage CHECK (reported_mileage >= 0),
  CONSTRAINT rental_extensions_valid_dates CHECK (new_end_date > previous_end_date),
  CONSTRAINT rental_extensions_status CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  CONSTRAINT rental_extensions_unique_paypal_order UNIQUE (paypal_order_id),
  CONSTRAINT rental_extensions_unique_capture UNIQUE (paypal_capture_id)
);

GRANT SELECT ON public.rental_extensions TO authenticated;
GRANT ALL ON public.rental_extensions TO service_role;

ALTER TABLE public.rental_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Renters view their own extensions"
ON public.rental_extensions
FOR SELECT
TO authenticated
USING (auth.uid() = renter_user_id);

CREATE INDEX rental_extensions_booking_idx ON public.rental_extensions (booking_id, created_at DESC);
CREATE INDEX rental_extensions_renter_idx ON public.rental_extensions (renter_user_id, created_at DESC);

CREATE TRIGGER rental_extensions_set_updated_at
BEFORE UPDATE ON public.rental_extensions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();