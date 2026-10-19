ALTER TABLE public.rental_bookings
  ADD COLUMN IF NOT EXISTS cancellation_status text,
  ADD COLUMN IF NOT EXISTS cancellation_fee numeric,
  ADD COLUMN IF NOT EXISTS cancellation_refund numeric,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancel_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reviewed_at timestamptz;

CREATE OR REPLACE FUNCTION public.guard_rental_cancellation_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_user NOT IN ('postgres','service_role','supabase_admin') THEN
    IF NEW.cancellation_status IS DISTINCT FROM OLD.cancellation_status
       OR NEW.cancellation_fee IS DISTINCT FROM OLD.cancellation_fee
       OR NEW.cancellation_refund IS DISTINCT FROM OLD.cancellation_refund
       OR NEW.cancellation_reason IS DISTINCT FROM OLD.cancellation_reason
       OR NEW.cancel_requested_at IS DISTINCT FROM OLD.cancel_requested_at
       OR NEW.cancel_reviewed_at IS DISTINCT FROM OLD.cancel_reviewed_at THEN
      RAISE EXCEPTION 'Cancellation details can only be set by the server';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS rental_bookings_guard_cancellation ON public.rental_bookings;
CREATE TRIGGER rental_bookings_guard_cancellation BEFORE UPDATE ON public.rental_bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_rental_cancellation_fields();