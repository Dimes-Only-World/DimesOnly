CREATE TABLE public.rental_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  wanted_start date NOT NULL,
  wanted_end date NOT NULL,
  amount numeric NOT NULL DEFAULT 150,
  payment_method text,
  paypal_order_id text,
  paypal_capture_id text,
  payment_reference text,
  status text NOT NULL DEFAULT 'pending_payment',
  applied_booking_id uuid,
  refund_reference text,
  refunded_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rental_holds TO service_role;
ALTER TABLE public.rental_holds ENABLE ROW LEVEL SECURITY;
CREATE INDEX rental_holds_vehicle_idx ON public.rental_holds(vehicle_id, status);
CREATE INDEX rental_holds_user_idx ON public.rental_holds(user_id);
CREATE TRIGGER rental_holds_updated BEFORE UPDATE ON public.rental_holds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.rental_bookings
  ADD COLUMN IF NOT EXISTS cancelled_by text,
  ADD COLUMN IF NOT EXISTS no_show boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hold_credit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hold_id uuid;

CREATE OR REPLACE VIEW public.v_vehicle_booked_dates WITH (security_invoker = false) AS
  SELECT vehicle_id, start_date, end_date
  FROM public.rental_bookings
  WHERE status IN ('paid','active') AND end_date IS NOT NULL AND end_date >= now() - interval '1 day';
GRANT SELECT ON public.v_vehicle_booked_dates TO anon, authenticated;

INSERT INTO public.app_settings(key, value) VALUES ('rental_hold_deposit', '{"value":150}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.rental_auto_no_show() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0; paid numeric; days integer; fee numeric;
BEGIN
  FOR r IN
    SELECT b.*, v.day_rate FROM rental_bookings b LEFT JOIN vehicles v ON v.id = b.vehicle_id
    WHERE b.status = 'paid' AND b.returned_at IS NULL AND b.pickup_mileage IS NULL
      AND now() > ((date_trunc('day', b.start_date AT TIME ZONE 'America/Los_Angeles') + interval '1 day') AT TIME ZONE 'America/Los_Angeles')
  LOOP
    paid := coalesce(r.amount_received, r.total_price, 0);
    days := greatest(1, ceil(extract(epoch FROM (coalesce(r.end_date, r.start_date + interval '1 day') - r.start_date)) / 86400));
    fee := round(least(paid, coalesce(r.day_rate,0) * (CASE WHEN days > 3 THEN 2 ELSE 1 END))::numeric, 2);
    UPDATE rental_bookings SET status = 'cancelled', no_show = true, cancelled_by = 'auto_no_show',
      cancellation_status = 'approved', cancellation_fee = fee, cancellation_refund = round(paid - fee, 2),
      cancellation_reason = format('No-show (car not picked up on the pickup day): %s day''s rent + trip fee = $%s kept, $%s refunded.',
        CASE WHEN days > 3 THEN '2' ELSE '1' END, to_char(fee,'FM999990.00'), to_char(paid - fee,'FM999990.00')),
      cancel_requested_at = now(), cancel_reviewed_at = now()
    WHERE id = r.id;
    UPDATE vehicles SET availability_status = 'available' WHERE id = r.vehicle_id
      AND NOT EXISTS (SELECT 1 FROM rental_bookings o WHERE o.vehicle_id = r.vehicle_id AND o.status = 'active');
    INSERT INTO notifications(recipient_id, user_id, title, message, type, link)
      VALUES (r.renter_user_id, r.renter_user_id, 'Rental cancelled — no-show', 'Your rental was cancelled because the car was not picked up. See My Rentals for the refund details.', 'rental', '/account/my-rentals');
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.rental_auto_no_show() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rental_holds_on_extension() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h record;
BEGIN
  IF NEW.end_date IS DISTINCT FROM OLD.end_date AND NEW.end_date > coalesce(OLD.end_date, NEW.end_date - interval '1 second') THEN
    FOR h IN SELECT * FROM rental_holds WHERE vehicle_id = NEW.vehicle_id AND status = 'held'
      AND wanted_start <= (NEW.end_date AT TIME ZONE 'America/Los_Angeles')::date
    LOOP
      UPDATE rental_holds SET status = 'refundable' WHERE id = h.id;
      INSERT INTO notifications(recipient_id, user_id, title, message, type, link)
        VALUES (h.user_id, h.user_id, 'Your held dates changed', 'The current renter extended. Pick new dates to keep your deposit, or request a refund in My Rentals.', 'rental', '/account/my-rentals');
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rental_bookings_hold_extension AFTER UPDATE OF end_date ON public.rental_bookings
  FOR EACH ROW EXECUTE FUNCTION public.rental_holds_on_extension();

SELECT cron.schedule('rental-auto-no-show', '0 * * * *', $$SELECT public.rental_auto_no_show();$$);