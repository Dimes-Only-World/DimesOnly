CREATE OR REPLACE FUNCTION public.finalize_rental_extension(
  p_extension_id uuid,
  p_capture_id text,
  p_paid_at timestamptz,
  p_statement_path text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ext public.rental_extensions%ROWTYPE;
  current_end timestamptz;
BEGIN
  SELECT * INTO ext
  FROM public.rental_extensions
  WHERE id = p_extension_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF ext.status = 'paid' THEN
    RETURN ext.paypal_capture_id = p_capture_id;
  END IF;

  IF ext.status <> 'pending' OR ext.paypal_order_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT end_date INTO current_end
  FROM public.rental_bookings
  WHERE id = ext.booking_id
  FOR UPDATE;

  IF current_end IS DISTINCT FROM ext.previous_end_date THEN
    RAISE EXCEPTION 'Rental dates changed before this extension completed';
  END IF;

  UPDATE public.rental_bookings
  SET end_date = ext.new_end_date,
      total_price = total_price + ext.extension_price,
      latest_reported_mileage = ext.reported_mileage,
      updated_at = now()
  WHERE id = ext.booking_id;

  UPDATE public.rental_extensions
  SET status = 'paid',
      paypal_capture_id = p_capture_id,
      paid_at = p_paid_at,
      statement_path = p_statement_path,
      updated_at = now()
  WHERE id = ext.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_rental_extension(uuid, text, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_rental_extension(uuid, text, timestamptz, text) TO service_role;